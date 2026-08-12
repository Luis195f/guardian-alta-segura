import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAssignedEpisodeDetail: vi.fn(),
  governanceExecute: vi.fn(),
  requireDemoEpisodePrincipal: vi.fn(),
  transitionExecute: vi.fn(),
}));

vi.mock("@/application/episode/manage-discharge-episode", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/application/episode/manage-discharge-episode")>();
  return {
    ...actual,
    GetEpisodeGovernanceViewService: class {
      execute = mocks.governanceExecute;
    },
    TransitionDischargeEpisodeService: class {
      execute = mocks.transitionExecute;
    },
  };
});

vi.mock("@/infrastructure/http/demo-episode-request", () => ({
  requireDemoEpisodePrincipal: mocks.requireDemoEpisodePrincipal,
}));

vi.mock("@/infrastructure/persistence/prisma-episode-unit-of-work", () => ({
  getAssignedEpisodeDetail: mocks.getAssignedEpisodeDetail,
  PrismaEpisodeUnitOfWork: class {},
}));

import {
  EpisodeDeniedError,
  EpisodeNotFoundError,
} from "@/application/episode/manage-discharge-episode";
import { GET, PATCH } from "@/app/api/demo/discharge-episodes/[episodeId]/route";

const correlationId = "018f673a-4e35-4060-99b5-7bc6feba3a97";
const episodeId = "synthetic-episode-foreign";
const context = { params: Promise.resolve({ episodeId }) };
const principal = {
  userId: "synthetic-nurse-requester",
  roles: ["nurse" as const],
  sessionId: "synthetic-session",
};
const episode = {
  id: episodeId,
  externalPseudonymousId: "SYNTH-PATIENT-FOREIGN",
  status: "DRAFT",
  version: 1,
};
const governance = { episodeVersion: 1 };

function request(method: "GET" | "PATCH", body?: object): NextRequest {
  const url = `http://127.0.0.1:3000/api/demo/discharge-episodes/${episodeId}`;
  const init = {
    method,
    headers: {
      "content-type": "application/json",
      "idempotency-key": "synthetic-regression-key",
      origin: "http://127.0.0.1:3000",
      "x-correlation-id": correlationId,
    },
  };
  return new NextRequest(url, body ? { ...init, body: JSON.stringify(body) } : init);
}

async function expectSanitizedError(
  response: Response,
  expected: { readonly status: number; readonly code: string; readonly message: string },
): Promise<void> {
  expect(response.status).toBe(expected.status);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-correlation-id")).toBe(correlationId);
  const body = await response.json();
  expect(body).toEqual({
    error: {
      code: expected.code,
      message: expected.message,
      correlationId,
    },
  });
  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain(episodeId);
  expect(serialized).not.toContain(episode.externalPseudonymousId);
  expect(serialized).not.toContain("Actor is not assigned");
  expect(serialized).not.toContain("stack");
}

describe("GET /api/demo/discharge-episodes/[episodeId] authorization mapping", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.requireDemoEpisodePrincipal.mockResolvedValue({
      principal,
      applicationOrigin: "http://127.0.0.1:3000",
    });
  });

  it("conserva el detalle autorizado", async () => {
    mocks.getAssignedEpisodeDetail.mockResolvedValue(episode);
    mocks.governanceExecute.mockResolvedValue(governance);

    const response = await GET(request("GET"), context);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({ episode, governance });
    expect(mocks.governanceExecute).toHaveBeenCalledWith(
      expect.objectContaining({ actor: principal, episodeId, correlationId }),
    );
  });

  it("convierte la lectura no asignada en un 403 sanitizado sin modificar el episodio", async () => {
    const originalState = structuredClone(episode);
    mocks.getAssignedEpisodeDetail.mockResolvedValue(null);
    mocks.governanceExecute.mockRejectedValue(
      new EpisodeDeniedError(
        `Actor is not assigned to ${episodeId} / ${episode.externalPseudonymousId}`,
      ),
    );

    const response = await GET(request("GET"), context);

    await expectSanitizedError(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Acceso denegado.",
    });
    expect(episode).toEqual(originalState);
    expect(mocks.transitionExecute).not.toHaveBeenCalled();
  });

  it("conserva el 403 del PATCH no asignado", async () => {
    const originalState = structuredClone(episode);
    mocks.transitionExecute.mockRejectedValue(new EpisodeDeniedError("Actor is not assigned"));

    const response = await PATCH(
      request("PATCH", { targetStatus: "ACTIVE", expectedVersion: 1 }),
      context,
    );

    await expectSanitizedError(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Acceso denegado.",
    });
    expect(episode).toEqual(originalState);
    expect(mocks.transitionExecute).toHaveBeenCalledOnce();
  });

  it("conserva el contrato 404 para un episodio inexistente", async () => {
    mocks.getAssignedEpisodeDetail.mockResolvedValue(null);
    mocks.governanceExecute.mockRejectedValue(new EpisodeNotFoundError("Episode not found"));

    const response = await GET(request("GET"), context);

    await expectSanitizedError(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Recurso no encontrado.",
    });
  });

  it("mantiene sanitizados los errores inesperados", async () => {
    mocks.getAssignedEpisodeDetail.mockResolvedValue(null);
    mocks.governanceExecute.mockRejectedValue(
      new Error(`Unexpected failure for ${episodeId} / ${episode.externalPseudonymousId}`),
    );

    const response = await GET(request("GET"), context);

    await expectSanitizedError(response, {
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Se ha producido un error técnico.",
    });
  });
});
