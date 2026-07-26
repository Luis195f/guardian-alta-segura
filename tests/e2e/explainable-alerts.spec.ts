import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { expect, request as apiRequest, test, type APIRequestContext } from "@playwright/test";

test.use({ userAgent: "guardian-explainable-alerts-e2e/1.0" });

const prisma = new PrismaClient();
const baseURL = "http://127.0.0.1:3000";
let episodeId = "";
let nonResponseSourceId = "";

async function createAuthenticatedContext(
  alias: "demo-admin" | "demo-nurse" | "demo-clinician",
): Promise<APIRequestContext> {
  const context = await apiRequest.newContext({
    baseURL,
    extraHTTPHeaders: { Origin: baseURL },
  });
  const response = await context.post("/api/demo/session", {
    data: { syntheticAlias: alias },
  });
  expect(response.status()).toBe(201);
  return context;
}

test.beforeAll(async () => {
  const [patient, nurse, clinician, protocol] = await Promise.all([
    prisma.patient.findUniqueOrThrow({
      where: { externalPseudonymousId: "SYNTH-PATIENT-001" },
    }),
    prisma.user.findUniqueOrThrow({ where: { syntheticAlias: "demo-nurse" } }),
    prisma.user.findUniqueOrThrow({ where: { syntheticAlias: "demo-clinician" } }),
    prisma.checkInProtocolVersion.findFirstOrThrow({
      where: {
        protocolKey: "synthetic-check-in-template",
        state: "SYNTHETIC_DEMO",
        isSyntheticFixture: true,
      },
      orderBy: { versionNumber: "desc" },
    }),
  ]);
  const episode = await prisma.dischargeEpisode.create({
    data: {
      patientId: patient.id,
      dischargeDate: new Date("2026-07-01T00:00:00.000Z"),
      programLengthDays: 30,
      responsibleNurseId: nurse.id,
      responsibleClinicianId: clinician.id,
      status: "ACTIVE",
      createdById: nurse.id,
      checkInProtocolVersionId: protocol.id,
    },
  });
  episodeId = episode.id;
  const nonResponse = await prisma.$transaction(async (transaction) => {
    const batch = await transaction.checkInAssignmentBatch.create({
      data: {
        episodeId,
        checkInProtocolVersionId: protocol.id,
        createdById: nurse.id,
        idempotencyKey: `e2e-source-batch:${randomUUID()}`,
        requestFingerprint: "a".repeat(64),
      },
    });
    const assignment = await transaction.checkInAssignment.create({
      data: {
        batchId: batch.id,
        episodeId,
        checkInProtocolVersionId: protocol.id,
        sequence: 1,
        scheduledFor: new Date("2026-07-17T07:00:00.000Z"),
        windowStartsAt: new Date("2026-07-17T07:00:00.000Z"),
        windowEndsAt: new Date("2026-07-17T08:00:00.000Z"),
        createdById: nurse.id,
      },
    });
    const outcome = await transaction.checkInOutcome.create({
      data: {
        assignmentId: assignment.id,
        checkInProtocolVersionId: protocol.id,
        type: "EXPIRED",
        recordedById: nurse.id,
        idempotencyKey: `e2e-source-outcome:${randomUUID()}`,
        requestFingerprint: "b".repeat(64),
        recordedAt: new Date("2026-07-17T08:00:00.000Z"),
      },
    });
    return transaction.nonResponseEvent.create({
      data: {
        outcomeId: outcome.id,
        assignmentId: assignment.id,
        checkInProtocolVersionId: protocol.id,
        outcomeType: "EXPIRED",
        reason: "WINDOW_EXPIRED",
        recordedById: nurse.id,
        recordedAt: new Date("2026-07-17T08:00:00.000Z"),
      },
    });
  });
  nonResponseSourceId = nonResponse.id;
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("fixtures siguen draft/no aprobados y admin no puede aprobarlos", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Usuario demo").selectOption("demo-admin");
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  const response = await page.request.get("/api/demo/rules");
  expect(response.ok()).toBe(true);
  const payload = (await response.json()) as {
    readonly rules: readonly {
      readonly isSyntheticFixture: boolean;
      readonly ruleKey: string;
      readonly versions: readonly {
        readonly id: string;
        readonly state: string;
        readonly approvedAt: string | null;
      }[];
    }[];
  };
  const canonicalFixtureKeys = new Set([
    "synthetic-no-response-48-hours",
    "synthetic-repeated-severe-family-conflict",
    "synthetic-positive-self-harm-ideation",
    "synthetic-low-sleep-and-non-adherence",
  ]);
  const canonicalFixtures = payload.rules.filter(({ ruleKey }) =>
    canonicalFixtureKeys.has(ruleKey),
  );
  expect(canonicalFixtures).toHaveLength(4);
  for (const rule of canonicalFixtures) {
    expect(rule.isSyntheticFixture).toBe(true);
    expect(rule.versions[0]).toMatchObject({ state: "draft", approvedAt: null });
  }

  const forbiddenApproval = await page.request.post(
    `/api/demo/rules/${canonicalFixtures[0]!.versions[0]!.id}/approve`,
    {
      headers: { Origin: "http://127.0.0.1:3000" },
      data: { approvalReference: "SYNTHETIC-E2E" },
    },
  );
  expect(forbiddenApproval.status()).toBe(403);
});

test("flujo HTTP conserva linaje, idempotencia, auditoría y revisión humana", async () => {
  const [admin, clinician, nurse] = await Promise.all([
    createAuthenticatedContext("demo-admin"),
    createAuthenticatedContext("demo-clinician"),
    createAuthenticatedContext("demo-nurse"),
  ]);
  const catalogResponse = await admin.get("/api/demo/rules");
  expect(catalogResponse.ok()).toBe(true);
  const catalog = (await catalogResponse.json()) as {
    readonly rules: readonly {
      readonly ruleKey: string;
      readonly versions: readonly { readonly dsl: unknown }[];
    }[];
  };
  const sourceFixture = catalog.rules.find(
    ({ ruleKey }) => ruleKey === "synthetic-no-response-48-hours",
  );
  expect(sourceFixture?.versions[0]?.dsl).toBeTruthy();

  const ruleKey = `e2e-explainable-${randomUUID()}`;
  const createdResponse = await admin.post("/api/demo/rules", {
    data: {
      ruleKey,
      name: "Ejemplo e2e sintético de no respuesta",
      dsl: sourceFixture!.versions[0]!.dsl,
    },
  });
  expect(createdResponse.status()).toBe(201);
  const created = (await createdResponse.json()) as {
    readonly ruleVersionId: string;
    readonly versionNumber: number;
  };
  expect(created.versionNumber).toBe(1);

  const forbiddenCreate = await nurse.post("/api/demo/rules", {
    data: {
      ruleKey: `e2e-forbidden-${randomUUID()}`,
      name: "Ejemplo e2e que no debe persistirse",
      dsl: sourceFixture!.versions[0]!.dsl,
    },
  });
  expect(forbiddenCreate.status()).toBe(403);

  const approval = await clinician.post(`/api/demo/rules/${created.ruleVersionId}/approve`, {
    data: { approvalReference: "SYNTHETIC-E2E-APPROVAL" },
  });
  expect(approval.status()).toBe(201);
  const activation = await admin.post(`/api/demo/rules/${created.ruleVersionId}/activate`);
  expect(activation.status()).toBe(200);

  const idempotencyKey = `alert-e2e:${randomUUID()}`;
  const evaluationPayload = {
    episodeId,
    inputs: [
      {
        inputKey: "non_response_hours",
        value: 48,
        observedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        source: {
          resourceType: "NonResponseEvent",
          resourceId: nonResponseSourceId,
          field: "elapsedHours",
          episodeId,
        },
      },
    ],
  };
  const evaluatedResponse = await nurse.post(`/api/demo/rules/${created.ruleVersionId}/evaluate`, {
    headers: { "Idempotency-Key": idempotencyKey },
    data: evaluationPayload,
  });
  expect(evaluatedResponse.status()).toBe(201);
  const evaluated = (await evaluatedResponse.json()) as {
    readonly evaluationId: string;
    readonly alertId: string;
    readonly outcome: string;
    readonly idempotent: boolean;
  };
  expect(evaluated).toMatchObject({ outcome: "matched", idempotent: false });

  const taskBeforeReview = await nurse.post("/api/demo/tasks", {
    headers: { "Idempotency-Key": `task-alert-open:${randomUUID()}` },
    data: {
      episodeId,
      alertId: evaluated.alertId,
      summary: "No debe asociarse antes de revisión",
    },
  });
  expect(taskBeforeReview.status()).toBe(409);

  const retryResponse = await nurse.post(`/api/demo/rules/${created.ruleVersionId}/evaluate`, {
    headers: { "Idempotency-Key": idempotencyKey },
    data: evaluationPayload,
  });
  expect(retryResponse.status()).toBe(200);
  await expect(retryResponse.json()).resolves.toEqual({ ...evaluated, idempotent: true });

  const conflictingRetry = await nurse.post(`/api/demo/rules/${created.ruleVersionId}/evaluate`, {
    headers: { "Idempotency-Key": idempotencyKey },
    data: {
      ...evaluationPayload,
      inputs: [{ ...evaluationPayload.inputs[0], value: 49 }],
    },
  });
  expect(conflictingRetry.status()).toBe(409);

  const alertsResponse = await nurse.get("/api/demo/alerts");
  expect(alertsResponse.ok()).toBe(true);
  const alertsPayload = (await alertsResponse.json()) as {
    readonly alerts: readonly {
      readonly id: string;
      readonly evaluationId: string;
      readonly ruleVersionId: string;
      readonly ruleVersionNumber: number;
      readonly explanation: string;
      readonly state: string;
      readonly reviews: readonly unknown[];
      readonly provenance: {
        readonly status: string;
        readonly lineage?: { readonly schemaVersion: number; readonly parents: readonly unknown[] };
      };
    }[];
  };
  const alert = alertsPayload.alerts.find(({ id }) => id === evaluated.alertId);
  expect(alert).toMatchObject({
    evaluationId: evaluated.evaluationId,
    ruleVersionId: created.ruleVersionId,
    ruleVersionNumber: 1,
    state: "open",
    reviews: [],
  });
  expect(alert?.provenance).toMatchObject({
    status: "VALID",
    lineage: { schemaVersion: 1 },
  });
  expect(alert?.provenance.lineage?.parents).toHaveLength(2);
  expect(alert?.explanation).toContain("Condición coincidente:");
  expect(alert).not.toHaveProperty("taskId");
  await expect(prisma.alertReview.count({ where: { alertId: evaluated.alertId } })).resolves.toBe(
    0,
  );

  const review = await nurse.post(`/api/demo/alerts/${evaluated.alertId}/reviews`, {
    data: { nextState: "reviewed" },
  });
  expect(review.status()).toBe(201);
  const taskAfterReview = await nurse.post("/api/demo/tasks", {
    headers: { "Idempotency-Key": `task-alert-reviewed:${randomUUID()}` },
    data: {
      episodeId,
      alertId: evaluated.alertId,
      summary: "Tarea explícita tras revisión humana",
    },
  });
  expect(taskAfterReview.status()).toBe(201);
  await expect(prisma.alertReview.count({ where: { alertId: evaluated.alertId } })).resolves.toBe(
    1,
  );
  await expect(
    prisma.auditEvent.count({
      where: {
        OR: [
          {
            action: "RULE_EVALUATED",
            resourceType: "RuleEvaluation",
            resourceId: evaluated.evaluationId,
          },
          {
            action: "ALERT_CREATED",
            resourceType: "Alert",
            resourceId: evaluated.alertId,
          },
        ],
      },
    }),
  ).resolves.toBe(2);

  await Promise.all([admin.dispose(), clinician.dispose(), nurse.dispose()]);
});

test("UI prioriza texto/estado con semáforo apagado y sin acción automática", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Lista de avisos" })).toHaveCount(0);

  await page.getByLabel("Usuario demo").selectOption("demo-nurse");
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/alerts");
  await expect(page.getByRole("heading", { name: "Lista de avisos" })).toBeVisible();
  await expect(page.getByTestId("traffic-light-status")).toHaveText(
    "Semáforo visual: desactivado.",
  );
  await expect(page.locator("section.explainable-alerts").getByRole("status")).toContainText(
    /No hay avisos|aviso\(s\), ordenados por estado y texto/,
  );
});
