import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { OmitCheckInAssignmentService } from "@/application/check-in/manage-check-ins";
import { PrismaCheckInUnitOfWork } from "@/infrastructure/persistence/prisma-check-in-unit-of-work";

const prisma = new PrismaClient();
type HttpAnswer =
  | { readonly questionDefinitionId: string; readonly scaleValue: number }
  | { readonly questionDefinitionId: string; readonly yesNoValue: boolean }
  | { readonly questionDefinitionId: string; readonly selectedOption: string }
  | { readonly questionDefinitionId: string; readonly shortTextValue: string };
let openAssignmentId = "";
let futureAssignmentId = "";
let httpAssignmentId = "";
let episodeId = "";
let batchId = "";
let protocolId = "";
let nurseId = "";

test.use({ userAgent: "guardian-check-in-e2e/1.0" });

async function focusByKeyboard(page: Page, locator: Locator) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await locator.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("Keyboard focus did not reach the expected control");
}

test.beforeAll(async () => {
  const [patientUser, patient, nurse, clinician, protocol] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { syntheticAlias: "demo-patient" } }),
    prisma.patient.findUniqueOrThrow({ where: { externalPseudonymousId: "SYNTH-PATIENT-001" } }),
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
  expect(patient.portalUserId).toBe(patientUser.id);
  const digitalParticipationPolicy = await prisma.policyVersion.create({
    data: {
      policyKey: `e2e-check-in-participation:${randomUUID()}`,
      version: "synthetic-v1",
      recordType: "DIGITAL_PARTICIPATION",
      state: "APPROVED",
      scope: "check-ins",
      actorUserId: clinician.id,
      origin: "INSTITUTIONAL_CONFIGURATION",
      evidenceType: "INSTITUTIONAL_DECISION_REFERENCE",
      evidenceRef: "SYNTHETIC-ONLY",
    },
  });
  await prisma.digitalParticipationRecord.create({
    data: {
      subjectUserId: patientUser.id,
      state: "ACTIVE",
      scope: "check-ins",
      policyVersionId: digitalParticipationPolicy.id,
      actorUserId: clinician.id,
      origin: "PROFESSIONAL_ENTRY",
      evidenceType: "RECORDED_INTERACTION",
      evidenceRef: "SYNTHETIC-ONLY",
    },
  });
  const now = new Date();
  const staleOpenAssignments = await prisma.checkInAssignment.findMany({
    where: {
      episode: { patient: { portalUserId: patientUser.id } },
      outcome: null,
      windowStartsAt: { lte: now },
      windowEndsAt: { gt: now },
    },
    select: { id: true },
  });
  const omitStaleAssignment = new OmitCheckInAssignmentService(new PrismaCheckInUnitOfWork());
  for (const assignment of staleOpenAssignments) {
    await omitStaleAssignment.execute({
      actor: { userId: patientUser.id, roles: ["patient"], sessionId: randomUUID() },
      assignmentId: assignment.id,
      idempotencyKey: `e2e-check-in-cleanup:${randomUUID()}`,
      correlationId: randomUUID(),
      now,
    });
  }
  const episode = await prisma.dischargeEpisode.create({
    data: {
      patientId: patient.id,
      dischargeDate: new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`),
      programLengthDays: 30,
      responsibleNurseId: nurse.id,
      responsibleClinicianId: clinician.id,
      status: "ACTIVE",
      createdById: nurse.id,
      checkInProtocolVersionId: protocol.id,
    },
  });
  const batch = await prisma.checkInAssignmentBatch.create({
    data: {
      episodeId: episode.id,
      checkInProtocolVersionId: protocol.id,
      createdById: nurse.id,
      idempotencyKey: `e2e-check-in-batch:${randomUUID()}`,
      requestFingerprint: "a".repeat(64),
    },
  });
  const currentTime = Date.now();
  const [open, future] = await prisma.$transaction([
    prisma.checkInAssignment.create({
      data: {
        batchId: batch.id,
        episodeId: episode.id,
        checkInProtocolVersionId: protocol.id,
        sequence: 1,
        scheduledFor: new Date(currentTime - 60_000),
        windowStartsAt: new Date(currentTime - 120_000),
        windowEndsAt: new Date(currentTime + 30 * 60_000),
        createdById: nurse.id,
      },
    }),
    prisma.checkInAssignment.create({
      data: {
        batchId: batch.id,
        episodeId: episode.id,
        checkInProtocolVersionId: protocol.id,
        sequence: 2,
        scheduledFor: new Date(currentTime + 24 * 60 * 60_000),
        windowStartsAt: new Date(currentTime + 24 * 60 * 60_000),
        windowEndsAt: new Date(currentTime + 25 * 60 * 60_000),
        createdById: nurse.id,
      },
    }),
  ]);
  openAssignmentId = open.id;
  futureAssignmentId = future.id;
  episodeId = episode.id;
  batchId = batch.id;
  protocolId = protocol.id;
  nurseId = nurse.id;
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("panel admin solo crea protocolos sintéticos no aprobados", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Usuario demo").selectOption("demo-admin");
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  await page.getByRole("button", { name: "Cargar versiones" }).click();

  await expect(
    page.getByRole("heading", { name: "Protocolos de check-in versionados" }),
  ).toBeVisible();
  await expect(page.getByText("PLANTILLA SINTÉTICA / NO APROBADA").first()).toBeVisible();
  await expect(page.getByLabel("Intervalo en días")).toBeVisible();
  await expect(page.getByLabel("Hora local")).toBeVisible();
  await expect(page.getByLabel("Zona IANA")).toHaveAttribute("aria-describedby", "time-zone-help");
  await expect(page.getByRole("button", { name: "Crear nueva versión" })).toBeEnabled();

  const protocolPayload = (await (
    await page.request.get("/api/demo/check-in-protocols")
  ).json()) as {
    protocols: readonly {
      id: string;
      protocolKey: string;
      title: string;
      questions: readonly Record<string, unknown>[];
      schedule: Record<string, unknown>;
    }[];
  };
  const base = protocolPayload.protocols[0]!;
  const rejected = await page.request.post("/api/demo/check-in-protocols", {
    headers: { Origin: "http://127.0.0.1:3000" },
    data: {
      protocolKey: base.protocolKey,
      title: base.title,
      state: "DRAFT",
      basedOnVersionId: base.id,
      isSyntheticFixture: false,
      questions: base.questions.map((question) =>
        Object.fromEntries(Object.entries(question).filter(([key]) => key !== "id")),
      ),
      schedule: base.schedule,
    },
  });
  expect(rejected.status()).toBe(400);

  const adminClinicalResponse = await page.request.get("/api/demo/check-ins");
  expect(adminClinicalResponse.status()).toBe(403);
});

test("paciente usa teclado, recibe errores accesibles y no selecciona la última futura", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Usuario demo").selectOption("demo-patient");
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  await expect(page).toHaveURL(/\/my-follow-up$/);
  await page.goto("/my-check-ins");

  await expect(page.getByRole("heading", { name: "Tu check-in" })).toBeVisible();
  await expect(page.getByText(/objetivo aproximado 60 segundos/i)).toBeVisible();
  const form = page.locator("form.check-in-form");
  await expect(form).toHaveAttribute("data-assignment-id", openAssignmentId);
  await expect(form).not.toHaveAttribute("data-assignment-id", futureAssignmentId);
  await expect(form.locator("fieldset")).toHaveCount(8);
  await expect(form.locator("legend")).toHaveCount(8);
  await expect(form.locator("input").first()).toBeFocused();

  const submit = page.getByRole("button", { name: "Registrar respuestas" });
  await focusByKeyboard(page, submit);
  await page.keyboard.press("Enter");
  const summary = page.locator("#check-in-form-error");
  await expect(summary).toBeFocused();
  await expect(summary).toContainText("campos obligatorios");
  await expect(form.locator("fieldset").first()).toHaveAttribute(
    "aria-describedby",
    /-help .*?-error/,
  );
  await expect(form.locator(".field-error").first()).toHaveText("Este campo es obligatorio.");

  const omit = page.getByRole("button", { name: "Omitir este check-in" });
  await focusByKeyboard(page, omit);
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Omisión registrada como evento de no respuesta/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Próximo check-in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Responder cuando se abra" })).toBeDisabled();
  await expect(page.locator("form.check-in-form")).toHaveCount(0);
  await expect(page.getByText("Pendiente", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/no genera alertas/i)).toBeVisible();

  const patientAdminResponse = await page.request.get("/api/demo/check-in-protocols");
  expect(patientAdminResponse.status()).toBe(403);
});

test("reintento HTTP concurrente devuelve 201/200 y nunca 500", async ({ page }) => {
  const now = Date.now();
  const httpAssignment = await prisma.checkInAssignment.create({
    data: {
      batchId,
      episodeId,
      checkInProtocolVersionId: protocolId,
      sequence: 3,
      scheduledFor: new Date(now - 30_000),
      windowStartsAt: new Date(now - 90_000),
      windowEndsAt: new Date(now + 30 * 60_000),
      createdById: nurseId,
    },
  });
  httpAssignmentId = httpAssignment.id;
  await page.goto("/");
  await page.getByLabel("Usuario demo").selectOption("demo-patient");
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  await expect(page).toHaveURL(/\/my-follow-up$/);

  const payload = (await (await page.request.get("/api/demo/check-ins")).json()) as {
    assignments: readonly {
      id: string;
      protocol: {
        questions: readonly {
          id: string;
          type: "SCALE" | "YES_NO" | "SINGLE_CHOICE" | "RESTRICTED_SHORT_TEXT";
          required: boolean;
          scaleMinimum?: number;
          options?: readonly string[];
        }[];
      };
    }[];
  };
  const assignment = payload.assignments.find(({ id }) => id === httpAssignmentId)!;
  const answers = assignment.protocol.questions.reduce<HttpAnswer[]>((result, question) => {
    if (!question.required) return result;
    if (question.type === "SCALE") {
      result.push({
        questionDefinitionId: question.id,
        scaleValue: question.scaleMinimum ?? 0,
      });
      return result;
    }
    if (question.type === "YES_NO") {
      result.push({ questionDefinitionId: question.id, yesNoValue: false });
      return result;
    }
    if (question.type === "SINGLE_CHOICE") {
      result.push({
        questionDefinitionId: question.id,
        selectedOption: question.options![0]!,
      });
      return result;
    }
    result.push({
      questionDefinitionId: question.id,
      shortTextValue: "Ejemplo sintético",
    });
    return result;
  }, []);
  const key = `http-concurrent:${randomUUID()}`;
  const request = {
    headers: {
      Origin: "http://127.0.0.1:3000",
      "Idempotency-Key": key,
    },
    data: { answers },
  };
  const responses = await Promise.all([
    page.request.post(`/api/demo/check-ins/${httpAssignmentId}/response`, request),
    page.request.post(`/api/demo/check-ins/${httpAssignmentId}/response`, request),
  ]);
  expect(responses.map((response) => response.status()).sort()).toEqual([200, 201]);
  expect(responses.every((response) => response.status() !== 500)).toBe(true);

  const changedAnswers = answers.map((answer, index) =>
    index === 0 && "scaleValue" in answer
      ? { ...answer, scaleValue: Number(answer.scaleValue) + 1 }
      : answer,
  );
  const conflict = await page.request.post(`/api/demo/check-ins/${httpAssignmentId}/response`, {
    headers: {
      Origin: "http://127.0.0.1:3000",
      "Idempotency-Key": key,
    },
    data: { answers: changedAnswers },
  });
  expect(conflict.status()).toBe(409);
});
