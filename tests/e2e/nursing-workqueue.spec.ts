import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { expect, request as apiRequest, test, type APIRequestContext } from "@playwright/test";

test.use({ userAgent: "guardian-nursing-workqueue-e2e/1.0" });

const prisma = new PrismaClient();
const baseURL = "http://127.0.0.1:3000";
let episodeId = "";
let nurseId = "";
let clinicianId = "";

async function authenticated(alias: string): Promise<APIRequestContext> {
  const context = await apiRequest.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  const response = await context.post("/api/demo/session", { data: { syntheticAlias: alias } });
  expect(response.status()).toBe(201);
  return context;
}

test.beforeAll(async () => {
  const [patient, nurse, clinician, protocol] = await Promise.all([
    prisma.patient.findUniqueOrThrow({ where: { externalPseudonymousId: "SYNTH-PATIENT-001" } }),
    prisma.user.findUniqueOrThrow({ where: { syntheticAlias: "demo-nurse" } }),
    prisma.user.findUniqueOrThrow({ where: { syntheticAlias: "demo-clinician" } }),
    prisma.checkInProtocolVersion.findFirstOrThrow({
      where: { protocolKey: "synthetic-check-in-template", isSyntheticFixture: true },
      orderBy: { versionNumber: "desc" },
    }),
  ]);
  nurseId = nurse.id;
  clinicianId = clinician.id;
  const episode = await prisma.dischargeEpisode.create({
    data: {
      patientId: patient.id,
      dischargeDate: new Date("2026-07-20T00:00:00.000Z"),
      programLengthDays: 30,
      responsibleNurseId: nurse.id,
      responsibleClinicianId: clinician.id,
      status: "ACTIVE",
      createdById: nurse.id,
      checkInProtocolVersionId: protocol.id,
    },
  });
  episodeId = episode.id;
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("patient, caregiver, support y admin no acceden a la cola clínica", async () => {
  for (const alias of ["demo-patient", "demo-caregiver", "demo-support", "demo-admin"]) {
    const context = await authenticated(alias);
    const response = await context.get("/api/demo/nursing-workqueue");
    expect(response.status(), alias).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "FORBIDDEN" } });
    await context.dispose();
  }
});

test("flujo HTTP crea y procesa tareas solo mediante acciones humanas trazables", async () => {
  const nurse = await authenticated("demo-nurse");
  await expect(prisma.task.count({ where: { episodeId } })).resolves.toBe(0);

  const missingEpisode = await nurse.post("/api/demo/tasks", {
    headers: { "Idempotency-Key": `task-e2e:${randomUUID()}` },
    data: { episodeId: "missing-synthetic-episode", summary: "No debe persistirse" },
  });
  expect(missingEpisode.status()).toBe(404);
  await expect(prisma.task.count({ where: { episodeId } })).resolves.toBe(0);

  const createResponse = await nurse.post("/api/demo/tasks", {
    headers: { "Idempotency-Key": `task-e2e:${randomUUID()}` },
    data: {
      episodeId,
      summary: "Coordinar seguimiento sintético manual",
      assignedToId: nurseId,
    },
  });
  expect(createResponse.status()).toBe(201);
  const created = (await createResponse.json()) as {
    readonly taskId: string;
    readonly state: string;
    readonly revision: number;
    readonly idempotent: boolean;
  };
  expect(created).toMatchObject({ state: "open", revision: 1, idempotent: false });
  expect(created).not.toHaveProperty("referral");
  expect(created).not.toHaveProperty("sbar");
  await expect(
    prisma.task.findUniqueOrThrow({ where: { id: created.taskId } }),
  ).resolves.toMatchObject({
    episodeId,
    alertId: null,
    currentState: "OPEN",
    createdById: nurseId,
  });

  const queueResponse = await nurse.get(
    `/api/demo/nursing-workqueue?status=ACTIVE&taskState=open&dateFrom=2026-07-20&dateTo=2026-07-20&responsibleProfessionalId=${clinicianId}&pendingOnly=true`,
  );
  expect(queueResponse.status()).toBe(200);
  const queue = (await queueResponse.json()) as {
    readonly entries: readonly {
      readonly episode: { readonly id: string };
      readonly tasks: readonly { readonly id: string; readonly state: string }[];
    }[];
    readonly metrics: { readonly openTaskCount: number };
  };
  const entry = queue.entries.find(({ episode }) => episode.id === episodeId);
  expect(entry?.tasks).toContainEqual(
    expect.objectContaining({ id: created.taskId, state: "open" }),
  );
  expect(queue.metrics.openTaskCount).toBeGreaterThanOrEqual(1);

  let revision = created.revision;
  for (const [body, prefix] of [
    [{ action: "assign", assignedToId: clinicianId }, "reassign"],
    [{ action: "contact-attempt", outcome: "no-answer" }, "contact"],
    [{ action: "note", note: "Nota breve sintética y minimizada" }, "note"],
    [
      { action: "resolve", reason: "Seguimiento organizativo completado por revisión humana" },
      "resolve",
    ],
  ] as const) {
    const response = await nurse.post(`/api/demo/tasks/${created.taskId}/events`, {
      headers: { "Idempotency-Key": `task-${prefix}:${randomUUID()}` },
      data: { ...body, expectedRevision: revision },
    });
    expect(response.status(), prefix).toBe(201);
    const result = (await response.json()) as { readonly revision: number };
    revision = result.revision;
  }

  const [task, episode, audits] = await Promise.all([
    prisma.task.findUniqueOrThrow({ where: { id: created.taskId }, include: { events: true } }),
    prisma.dischargeEpisode.findUniqueOrThrow({ where: { id: episodeId } }),
    prisma.auditEvent.findMany({ where: { resourceType: "Task", resourceId: created.taskId } }),
  ]);
  expect(task).toMatchObject({
    currentState: "RESOLVED",
    revision: 5,
    assignedToId: clinicianId,
    resolvedById: nurseId,
    resolvedAt: expect.any(Date),
    resolutionReason: "Seguimiento organizativo completado por revisión humana",
  });
  expect(task.events).toHaveLength(5);
  expect(episode.status).toBe("ACTIVE");
  expect(audits.map(({ action }) => action)).toEqual([
    "TASK_CREATED",
    "TASK_ASSIGNED",
    "TASK_REASSIGNED",
    "TASK_CONTACT_ATTEMPT_RECORDED",
    "TASK_NOTE_RECORDED",
    "TASK_RESOLVED",
  ]);
  expect(JSON.stringify(audits)).not.toMatch(
    /Nota breve sintética|Seguimiento organizativo completado/,
  );
  await nurse.dispose();
});

test("dos resoluciones concurrentes producen un éxito y un conflicto", async () => {
  const [nurse, clinician] = await Promise.all([
    authenticated("demo-nurse"),
    authenticated("demo-clinician"),
  ]);
  const creation = await nurse.post("/api/demo/tasks", {
    headers: { "Idempotency-Key": `task-e2e:${randomUUID()}` },
    data: { episodeId, summary: "Comprobar resolución concurrente" },
  });
  const task = (await creation.json()) as { readonly taskId: string; readonly revision: number };
  const responses = await Promise.all([
    nurse.post(`/api/demo/tasks/${task.taskId}/events`, {
      headers: { "Idempotency-Key": `task-resolve:${randomUUID()}` },
      data: {
        action: "resolve",
        reason: "Resolución humana desde enfermería",
        expectedRevision: 1,
      },
    }),
    clinician.post(`/api/demo/tasks/${task.taskId}/events`, {
      headers: { "Idempotency-Key": `task-resolve:${randomUUID()}` },
      data: { action: "resolve", reason: "Resolución humana desde clínica", expectedRevision: 1 },
    }),
  ]);
  expect(responses.map((response) => response.status()).sort()).toEqual([201, 409]);
  await expect(
    prisma.taskEvent.count({ where: { taskId: task.taskId, type: "RESOLVED" } }),
  ).resolves.toBe(1);
  await Promise.all([nurse.dispose(), clinician.dispose()]);
});

test("creación HTTP concurrente conserva idempotencia y nunca expone P2002 como 500", async () => {
  const nurse = await authenticated("demo-nurse");
  const sameKey = `task-e2e-create:${randomUUID()}`;
  const samePayload = { episodeId, summary: "Misma creación concurrente HTTP" };
  const same = await Promise.all([
    nurse.post("/api/demo/tasks", {
      headers: { "Idempotency-Key": sameKey },
      data: samePayload,
    }),
    nurse.post("/api/demo/tasks", {
      headers: { "Idempotency-Key": sameKey },
      data: samePayload,
    }),
  ]);
  expect(same.map((response) => response.status()).sort()).toEqual([200, 201]);
  const sameBodies = (await Promise.all(same.map((response) => response.json()))) as {
    readonly taskId: string;
  }[];
  expect(new Set(sameBodies.map(({ taskId }) => taskId)).size).toBe(1);

  const differentKey = `task-e2e-create:${randomUUID()}`;
  const different = await Promise.all([
    nurse.post("/api/demo/tasks", {
      headers: { "Idempotency-Key": differentKey },
      data: { episodeId, summary: "Huella HTTP concurrente A" },
    }),
    nurse.post("/api/demo/tasks", {
      headers: { "Idempotency-Key": differentKey },
      data: { episodeId, summary: "Huella HTTP concurrente B" },
    }),
  ]);
  expect(different.map((response) => response.status()).sort()).toEqual([201, 409]);
  expect(different.every((response) => response.status() !== 500)).toBe(true);
  await nurse.dispose();
});

test("UI ofrece filtros accesibles y estados vacío y de error", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Cola de seguimiento" })).toHaveCount(0);

  await page.getByLabel("Usuario demo").selectOption("demo-nurse");
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/workqueue");
  await expect(page.getByRole("heading", { name: "Cola de seguimiento" })).toBeVisible();
  await page.getByText("Filtros", { exact: true }).click();
  await expect(page.getByLabel("Estado del episodio")).toBeVisible();
  await expect(page.getByLabel("Estado de tarea")).toBeVisible();
  await expect(page.getByLabel("Alta desde")).toBeVisible();
  await expect(page.getByLabel("Alta hasta")).toBeVisible();
  await expect(page.getByLabel("Profesional responsable")).toBeVisible();
  await expect(page.getByLabel("Solo elementos pendientes")).toBeVisible();

  await page.getByLabel("Alta desde").fill("2099-01-01");
  await page.getByRole("button", { name: "Cargar cola" }).click();
  await expect(page.getByText("Cola vacía para estos filtros.")).toBeVisible();
  await expect(page.locator("section.nursing-workqueue").getByRole("status")).toContainText(
    "No hay elementos",
  );

  await page.route("**/api/demo/nursing-workqueue?**", (route) => route.abort());
  await page.getByRole("button", { name: "Cargar cola" }).click();
  await expect(page.locator("section.nursing-workqueue").getByRole("status")).toContainText(
    "No se pudo cargar la cola. No se ha realizado ninguna acción.",
  );
});
