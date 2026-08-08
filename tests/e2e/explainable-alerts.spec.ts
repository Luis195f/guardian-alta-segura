import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { expect, request as apiRequest, test, type APIRequestContext } from "@playwright/test";

test.use({ userAgent: "guardian-explainable-alerts-e2e/1.0" });

const prisma = new PrismaClient();
const baseURL = "http://127.0.0.1:3000";
let episodeId = "";
let nonResponseSourceId = "";

async function createAuthenticatedContext(
  alias:
    | "demo-admin"
    | "demo-nurse"
    | "demo-clinician"
    | "demo-patient"
    | "demo-caregiver"
    | "demo-support",
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

  for (const alias of ["demo-patient", "demo-caregiver", "demo-support"] as const) {
    const forbiddenActor = await createAuthenticatedContext(alias);
    const forbiddenReview = await forbiddenActor.post(
      `/api/demo/alerts/${evaluated.alertId}/reviews`,
      {
        headers: { "Idempotency-Key": `alert-review-forbidden:${randomUUID()}` },
        data: { expectedState: "open", nextState: "reviewed" },
      },
    );
    expect(forbiddenReview.status(), alias).toBe(403);
    await forbiddenActor.dispose();
  }

  const reviewKey = `alert-review-e2e:${randomUUID()}`;
  const reviewPayload = { expectedState: "open", nextState: "reviewed" } as const;
  const review = await clinician.post(`/api/demo/alerts/${evaluated.alertId}/reviews`, {
    headers: { "Idempotency-Key": reviewKey },
    data: reviewPayload,
  });
  expect(review.status()).toBe(201);
  const reviewed = (await review.json()) as {
    readonly alertId: string;
    readonly reviewId: string;
    readonly state: string;
    readonly idempotent: boolean;
  };
  expect(reviewed).toMatchObject({ state: "reviewed", idempotent: false });
  const reviewReplay = await clinician.post(`/api/demo/alerts/${evaluated.alertId}/reviews`, {
    headers: { "Idempotency-Key": reviewKey },
    data: reviewPayload,
  });
  expect(reviewReplay.status()).toBe(200);
  await expect(reviewReplay.json()).resolves.toEqual({ ...reviewed, idempotent: true });
  const reviewConflict = await clinician.post(`/api/demo/alerts/${evaluated.alertId}/reviews`, {
    headers: { "Idempotency-Key": reviewKey },
    data: { ...reviewPayload, reason: "Huella distinta" },
  });
  expect(reviewConflict.status()).toBe(409);

  const taskKey = `task-alert-reviewed:${randomUUID()}`;
  const taskPayload = {
    episodeId,
    alertId: evaluated.alertId,
    summary: "Tarea explícita tras revisión humana",
  } as const;
  const taskAfterReview = await nurse.post("/api/demo/tasks", {
    headers: { "Idempotency-Key": taskKey },
    data: taskPayload,
  });
  expect(taskAfterReview.status()).toBe(201);
  const createdTask = (await taskAfterReview.json()) as {
    readonly taskId: string;
    readonly idempotent: boolean;
  };
  const taskReplay = await nurse.post("/api/demo/tasks", {
    headers: { "Idempotency-Key": taskKey },
    data: taskPayload,
  });
  expect(taskReplay.status()).toBe(200);
  await expect(taskReplay.json()).resolves.toEqual({ ...createdTask, idempotent: true });
  const taskConflict = await nurse.post("/api/demo/tasks", {
    headers: { "Idempotency-Key": taskKey },
    data: { ...taskPayload, summary: "Huella distinta de tarea" },
  });
  expect(taskConflict.status()).toBe(409);
  const [storedReview, storedTask] = await Promise.all([
    prisma.alertReview.findFirstOrThrow({
      where: { alertId: evaluated.alertId },
      orderBy: { reviewedAt: "asc" },
    }),
    prisma.task.findUniqueOrThrow({ where: { id: createdTask.taskId } }),
  ]);
  expect(storedReview.reviewedById).not.toBe(storedTask.createdById);
  await expect(prisma.alertReview.count({ where: { alertId: evaluated.alertId } })).resolves.toBe(
    1,
  );
  await expect(
    prisma.auditEvent.count({
      where: {
        resourceType: "Alert",
        resourceId: evaluated.alertId,
        action: "ALERT_REVIEWED",
      },
    }),
  ).resolves.toBe(1);
  await expect(
    prisma.auditEvent.count({
      where: { resourceType: "Task", resourceId: createdTask.taskId, action: "TASK_CREATED" },
    }),
  ).resolves.toBe(1);
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

test("UI muestra explicación y confirma revisión por teclado sin acción automática", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Lista de avisos" })).toHaveCount(0);

  await page.getByLabel("Usuario demo").selectOption("demo-nurse");
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  let alertState: "open" | "reviewed" = "open";
  let reviewRequest: { readonly expectedState?: string; readonly nextState?: string } = {};
  let reviewKey = "";
  let taskRequestCount = 0;
  await page.route("**/api/demo/alerts", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        explainableTrafficLight: false,
        alerts: [
          {
            id: "synthetic-ui-alert",
            evaluationId: "synthetic-ui-evaluation",
            ruleName: "Regla sintética para interacción",
            ruleVersionId: "synthetic-rule-version",
            ruleVersionNumber: 1,
            explanation: "Explicación determinista visible para revisión humana.",
            administrativeSeverity: "standard",
            reviewOwner: "nurse",
            triggeredAt: "2026-08-08T10:00:00.000Z",
            state: alertState,
          },
        ],
      }),
    });
  });
  await page.route("**/api/demo/alerts/synthetic-ui-alert/reviews", async (route) => {
    reviewKey = route.request().headers()["idempotency-key"] ?? "";
    reviewRequest = route.request().postDataJSON() as typeof reviewRequest;
    alertState = "reviewed";
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        alertId: "synthetic-ui-alert",
        reviewId: "synthetic-ui-review",
        state: "reviewed",
        idempotent: false,
      }),
    });
  });
  await page.route("**/api/demo/tasks", async (route) => {
    taskRequestCount += 1;
    await route.abort();
  });
  await page.goto("/alerts");
  await expect(page.getByRole("heading", { name: "Lista de avisos" })).toBeVisible();
  await expect(page.getByTestId("traffic-light-status")).toHaveText(
    "Semáforo visual: desactivado.",
  );
  await expect(
    page.getByText("Explicación determinista visible para revisión humana."),
  ).toBeVisible();
  const reviewButton = page.getByRole("button", { name: "Revisar" });
  await reviewButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("section.explainable-alerts").getByRole("status")).toHaveText(
    "Revisión humana registrada; no se ha creado ninguna acción clínica automática.",
  );
  expect(reviewKey).toMatch(/^alert-review:[0-9a-f-]{36}$/);
  expect(reviewRequest).toEqual({ expectedState: "open", nextState: "reviewed" });
  expect(taskRequestCount).toBe(0);
});

test("UI trata un conflicto stale como recarga sin segunda revisión", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Usuario demo").selectOption("demo-nurse");
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  let alertState: "open" | "reviewed" = "open";
  await page.route("**/api/demo/alerts", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        explainableTrafficLight: false,
        alerts: [
          {
            id: "synthetic-stale-alert",
            evaluationId: "synthetic-stale-evaluation",
            ruleName: "Regla sintética stale",
            ruleVersionId: "synthetic-stale-version",
            ruleVersionNumber: 1,
            explanation: "Explicación disponible antes y después del conflicto.",
            administrativeSeverity: "standard",
            reviewOwner: "nurse",
            triggeredAt: "2026-08-08T10:00:00.000Z",
            state: alertState,
          },
        ],
      }),
    });
  });
  await page.route("**/api/demo/alerts/synthetic-stale-alert/reviews", async (route) => {
    alertState = "reviewed";
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "CONFLICT" } }),
    });
  });

  await page.goto("/alerts");
  await page.getByRole("button", { name: "Revisar" }).click();
  await expect(page.locator("section.explainable-alerts").getByRole("status")).toHaveText(
    "El aviso cambió desde que se mostró. Se ha recargado sin registrar una segunda revisión.",
  );
  await expect(page.getByText("Revisado", { exact: true })).toBeVisible();
});
