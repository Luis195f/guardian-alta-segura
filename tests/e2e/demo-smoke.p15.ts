import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { request as apiRequest, type APIRequestContext } from "@playwright/test";

import { expect, test } from "../support/p14-playwright";

const baseURL = "http://127.0.0.1:3000";
const prisma = new PrismaClient();

async function authenticated(alias: string): Promise<APIRequestContext> {
  const context = await apiRequest.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  const response = await context.post("/api/demo/session", { data: { syntheticAlias: alias } });
  expect(response.status(), alias).toBe(201);
  return context;
}

test.afterAll(async () => prisma.$disconnect());

test("recorrido sintético completo, seis roles y denegaciones sin tráfico externo", async ({
  page,
}) => {
  const roles = [
    ["demo-admin", /\/admin$/],
    ["demo-nurse", /\/dashboard$/],
    ["demo-clinician", /\/dashboard$/],
    ["demo-patient", /\/my-follow-up$/],
    ["demo-caregiver", /\/caregiver$/],
    ["demo-support", /\/support$/],
  ] as const;
  for (const [alias, destination] of roles) {
    await page.goto("/");
    await page.getByLabel("Usuario demo").selectOption(alias);
    await page.getByRole("button", { name: "INICIAR DEMO" }).click();
    await expect(page).toHaveURL(destination);
    await expect(page.getByText("DEMO SINTÉTICA · NO USO CLÍNICO", { exact: true })).toBeVisible();
    await expect(page.getByText("FUTURO-NO_AUTORIZADO", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
  }

  const [patient, nurse, admin, support, caregiver] = await Promise.all([
    authenticated("demo-patient"),
    authenticated("demo-nurse"),
    authenticated("demo-admin"),
    authenticated("demo-support"),
    authenticated("demo-caregiver"),
  ]);

  const patientPlan = await patient.get("/api/demo/safety-plans");
  const patientCheckIn = await patient.get("/api/demo/check-ins");
  expect(patientPlan.status()).toBe(200);
  expect(patientCheckIn.status()).toBe(200);
  expect(JSON.stringify(await patientCheckIn.json())).not.toMatch(/diagnos|predict|recommend/iu);

  const alertsResponse = await nurse.get("/api/demo/alerts");
  expect(alertsResponse.status()).toBe(200);
  const alertsPayload = (await alertsResponse.json()) as {
    readonly alerts: readonly { readonly id: string; readonly state: string }[];
  };
  const alert = alertsPayload.alerts.find(({ id }) => id === "synthetic-demo-flow-alert-1");
  expect(alert).toMatchObject({ state: "open" });

  const review = await nurse.post(`/api/demo/alerts/${alert!.id}/reviews`, {
    headers: { "Idempotency-Key": `smoke-review:${randomUUID()}` },
    data: { expectedState: "open", nextState: "reviewed" },
  });
  expect(review.status()).toBe(201);

  const taskResponse = await nurse.post("/api/demo/tasks", {
    headers: { "Idempotency-Key": `smoke-task:${randomUUID()}` },
    data: {
      episodeId: "synthetic-demo-episode-buildweek",
      alertId: alert!.id,
      summary: "Seguimiento sintético creado manualmente",
    },
  });
  expect(taskResponse.status()).toBe(201);
  const task = (await taskResponse.json()) as {
    readonly taskId: string;
    readonly revision: number;
  };
  let revision = task.revision;
  for (const [action, body] of [
    ["contact", { action: "contact-attempt", outcome: "no-answer" }],
    ["note", { action: "note", note: "Nota sintética minimizada" }],
    ["resolve", { action: "resolve", reason: "Cierre organizativo sintético por revisión humana" }],
  ] as const) {
    const response = await nurse.post(`/api/demo/tasks/${task.taskId}/events`, {
      headers: { "Idempotency-Key": `smoke-${action}:${randomUUID()}` },
      data: { ...body, expectedRevision: revision },
    });
    expect(response.status(), action).toBe(201);
    revision = ((await response.json()) as { readonly revision: number }).revision;
  }
  const storedTask = await prisma.task.findUniqueOrThrow({
    where: { id: task.taskId },
    include: { events: true },
  });
  expect(storedTask.currentState).toBe("RESOLVED");
  expect(storedTask.events).toHaveLength(4);

  for (const context of [admin, support]) {
    expect((await context.get("/api/demo/nursing-workqueue")).status()).toBe(403);
    expect((await context.get("/api/demo/resources/simulated-clinical-record")).status()).toBe(403);
  }
  expect((await patient.get("/api/demo/nursing-workqueue")).status()).toBe(403);
  expect((await caregiver.get("/api/demo/caregiver/portal")).status()).toBe(401);
  const health = await support.get("/api/health");
  await expect(health.json()).resolves.toEqual({ status: "ok", service: "guardian-alta-segura" });

  await Promise.all([
    patient.dispose(),
    nurse.dispose(),
    admin.dispose(),
    support.dispose(),
    caregiver.dispose(),
  ]);
});
