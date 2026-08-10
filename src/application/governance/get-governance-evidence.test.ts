import { describe, expect, it, vi } from "vitest";

import {
  GetEpisodeGovernanceEvidenceService,
  GovernanceEvidenceConcurrentChangeError,
  GovernanceEvidenceDeniedError,
  GovernanceEvidenceInvalidError,
  GovernanceEvidenceNotFoundError,
} from "@/application/governance/get-governance-evidence";
import type {
  GovernanceEvidenceReader,
  GovernanceEvidenceSource,
} from "@/application/ports/governance-evidence-reader";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import type { EpisodeGovernanceView } from "@/domain/episode/activation-policy";

const now = new Date("2026-07-27T10:00:00.000Z");

function principal(
  role: "admin" | "nurse" | "clinician" | "patient" | "caregiver" | "support",
  userId = `${role}-1`,
): AuthenticatedPrincipal {
  return { userId, roles: [role], sessionId: "session-1" };
}

function governance(episodeId = "episode-1", version = 1): EpisodeGovernanceView {
  return {
    episodeId,
    episodeVersion: version,
    episodeStatus: "ACTIVE",
    responsibleNurse: { userId: "nurse-1", active: true },
    responsibleClinician: { userId: "clinician-1", active: true },
    checkInProtocol: {
      versionId: "protocol-v1",
      protocolKey: "synthetic-protocol",
      versionNumber: 1,
      state: "SYNTHETIC_DEMO",
      isSyntheticFixture: true,
    },
    activationAuthorization: { status: "AUTHORIZED", identityPolicyVersionId: "policy-1" },
    openObligations: [],
    openObligationsCoverage: {
      returned: 0,
      limit: 50,
      truncated: false,
      basis: "TECHNICAL_DEMO_LIMIT",
    },
    blockers: [],
    pendingInstitutionalDecisions: [{ decisionId: "DEC-002", status: "PENDING" }],
    organizationallyGoverned: false,
    transitionDecision: { targetStatus: "CLOSED", authorization: "NOT_AUTHORIZED" },
    evaluatedAt: now,
  };
}

function source(episodeId = "episode-1", version = 1): GovernanceEvidenceSource {
  const emptyCoverage = { returned: 0, limit: 100, truncated: false };
  return {
    episode: {
      id: episodeId,
      state: "ACTIVE",
      version,
      responsibleNurseId: "nurse-1",
      responsibleClinicianId: "clinician-1",
      createdAt: now,
      updatedAt: now,
      checkInProtocol: {
        versionId: "protocol-v1",
        protocolKey: "synthetic-protocol",
        versionNumber: 1,
      },
    },
    transitions: [],
    alerts: [],
    tasks: [],
    auditEvents: [],
    coverage: {
      episodeTransitions: emptyCoverage,
      alerts: emptyCoverage,
      alertReviews: emptyCoverage,
      tasks: emptyCoverage,
      taskEvents: emptyCoverage,
      auditEvents: emptyCoverage,
    },
  };
}

function service(input?: {
  readonly evidence?: GovernanceEvidenceSource | null;
  readonly governance?: EpisodeGovernanceView;
}) {
  const evidence = input && "evidence" in input ? input.evidence : source();
  const governanceView = input?.governance ?? governance();
  const readAuthorizedEpisodeEvidenceSnapshot = vi.fn(async () =>
    evidence ? { source: evidence, governance: governanceView } : null,
  );
  return {
    instance: new GetEpisodeGovernanceEvidenceService({
      readAuthorizedEpisodeEvidenceSnapshot,
    } satisfies GovernanceEvidenceReader),
    readAuthorizedEpisodeEvidenceSnapshot,
  };
}

describe("GetEpisodeGovernanceEvidenceService", () => {
  it.each(["nurse", "clinician"] as const)(
    "permite al %s responsable obtener una proyección read-only",
    async (role) => {
      const fixture = service();
      const view = await fixture.instance.execute({
        actor: principal(role),
        episodeId: "episode-1",
        correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
        now,
      });

      expect(view).toMatchObject({
        viewType: "EPISODE_GOVERNANCE_EVIDENCE",
        readOnly: true,
        episode: { id: "episode-1" },
      });
      expect(fixture.readAuthorizedEpisodeEvidenceSnapshot).toHaveBeenCalledWith({
        episodeId: "episode-1",
        actorUserId: `${role}-1`,
        actorProfessionalRoles: [role],
        correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
        evaluatedAt: now,
      });
    },
  );

  it.each(["patient", "caregiver", "support", "admin"] as const)(
    "deniega a %s antes de consultar evidencia",
    async (role) => {
      const fixture = service();
      await expect(
        fixture.instance.execute({
          actor: principal(role),
          episodeId: "episode-1",
          correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
          now,
        }),
      ).rejects.toBeInstanceOf(GovernanceEvidenceDeniedError);
      expect(fixture.readAuthorizedEpisodeEvidenceSnapshot).not.toHaveBeenCalled();
    },
  );

  it("falla cerrado cuando el reader no encuentra un episodio autorizado", async () => {
    const fixture = service({ evidence: null });
    await expect(
      fixture.instance.execute({
        actor: principal("clinician"),
        episodeId: "episode-1",
        correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
        now,
      }),
    ).rejects.toBeInstanceOf(GovernanceEvidenceNotFoundError);
  });

  it("rechaza identificadores no técnicos antes de consultar persistencia", async () => {
    const fixture = service();
    await expect(
      fixture.instance.execute({
        actor: principal("clinician"),
        episodeId: "../episode-1",
        correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
        now,
      }),
    ).rejects.toBeInstanceOf(GovernanceEvidenceInvalidError);
    expect(fixture.readAuthorizedEpisodeEvidenceSnapshot).not.toHaveBeenCalled();
  });

  it("no compone evidencia cruzada si el reader devuelve otro episodio", async () => {
    const fixture = service({ evidence: source("episode-2"), governance: governance("episode-1") });
    await expect(
      fixture.instance.execute({
        actor: principal("nurse"),
        episodeId: "episode-1",
        correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
        now,
      }),
    ).rejects.toBeInstanceOf(GovernanceEvidenceConcurrentChangeError);
  });

  it("falla cerrado si cambia la versión durante la composición", async () => {
    const fixture = service({ evidence: source("episode-1", 2) });
    await expect(
      fixture.instance.execute({
        actor: principal("nurse"),
        episodeId: "episode-1",
        correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
        now,
      }),
    ).rejects.toBeInstanceOf(GovernanceEvidenceConcurrentChangeError);
  });
});
