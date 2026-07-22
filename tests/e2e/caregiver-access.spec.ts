import { createHash, randomBytes, randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";

const prisma = new PrismaClient();

test.use({ userAgent: "guardian-caregiver-e2e/1.0" });

test.afterAll(async () => {
  await prisma.$disconnect();
});

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function startDemo(page: Page, alias: string) {
  const switcher = page.getByRole("button", { name: "Cambiar usuario demo" });
  if (await switcher.isVisible().catch(() => false)) await switcher.click();
  else await page.goto("/");
  await page.getByLabel("Usuario demo").selectOption(alias);
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  const destination: Readonly<Record<string, RegExp>> = {
    "demo-patient": /\/my-follow-up$/,
    "demo-caregiver": /\/caregiver$/,
    "demo-support": /\/support$/,
  };
  await expect(page).toHaveURL(destination[alias]!);
}

async function createCaregiverFixture() {
  const [admin, patientUser, patient, nurse, clinician, caregiverUser, protocol] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { syntheticAlias: "demo-admin" } }),
      prisma.user.findUniqueOrThrow({ where: { syntheticAlias: "demo-patient" } }),
      prisma.patient.findUniqueOrThrow({ where: { externalPseudonymousId: "SYNTH-PATIENT-001" } }),
      prisma.user.findUniqueOrThrow({ where: { syntheticAlias: "demo-nurse" } }),
      prisma.user.findUniqueOrThrow({ where: { syntheticAlias: "demo-clinician" } }),
      prisma.user.findUniqueOrThrow({ where: { syntheticAlias: "demo-caregiver" } }),
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
      dischargeDate: new Date("2026-07-21T00:00:00.000Z"),
      programLengthDays: 30,
      responsibleNurseId: nurse.id,
      responsibleClinicianId: clinician.id,
      status: "ACTIVE",
      createdById: nurse.id,
      checkInProtocolVersionId: protocol.id,
    },
  });
  const policy = await prisma.policyVersion.create({
    data: {
      policyKey: `caregiver-e2e-${randomUUID()}`,
      version: "e2e-v1",
      recordType: "CAREGIVER_AUTHORIZATION",
      state: "APPROVED",
      scope: "caregiver:portal",
      actorUserId: admin.id,
      origin: "INSTITUTIONAL_CONFIGURATION",
      evidenceType: "INSTITUTIONAL_DECISION_REFERENCE",
      evidenceRef: "SYNTHETIC-E2E-ONLY",
    },
  });
  const authorization = await prisma.caregiverAuthorization.create({
    data: {
      subjectUserId: patientUser.id,
      caregiverUserId: caregiverUser.id,
      state: "ACTIVE",
      scope: "caregiver:portal",
      policyVersionId: policy.id,
      actorUserId: patientUser.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      origin: "DEMO_UI",
      evidenceType: "RECORDED_INTERACTION",
      evidenceRef: "SYNTHETIC-E2E-AUTHORIZATION",
    },
  });
  return { patientUser, caregiverUser, episode, authorization };
}

test("muestra los límites del portal e impide que support acepte una invitación", async ({
  page,
}) => {
  const fixture = await createCaregiverFixture();
  const profile = await prisma.caregiverProfile.upsert({
    where: { caregiverUserId: fixture.caregiverUser.id },
    create: {
      caregiverUserId: fixture.caregiverUser.id,
      externalPseudonymousId: `cg_${randomBytes(12).toString("hex")}`,
    },
    update: {},
  });
  await prisma.caregiverAuthorizationScope.create({
    data: {
      caregiverAuthorizationId: fixture.authorization.id,
      dischargeEpisodeId: fixture.episode.id,
      version: 1,
      capabilities: [],
      allowedPlanSections: [],
      authorizedResourceKeys: [],
      actorUserId: fixture.patientUser.id,
    },
  });
  const validToken = randomBytes(32).toString("base64url");
  const invitation = await prisma.caregiverInvitation.create({
    data: {
      caregiverAuthorizationId: fixture.authorization.id,
      caregiverProfileId: profile.id,
      dischargeEpisodeId: fixture.episode.id,
      invitationTokenHash: sha256(validToken),
      createdById: fixture.patientUser.id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });
  await startDemo(page, "demo-support");
  await expect(page.getByLabel("Token de invitación local")).toHaveCount(0);
  const denial = await page.request.post("/api/demo/caregiver/invitations/accept", {
    headers: { Origin: "http://127.0.0.1:3000" },
    data: { token: validToken },
  });
  expect(denial.status()).toBe(403);
  await expect(
    prisma.caregiverInvitation.findUniqueOrThrow({ where: { id: invitation.id } }),
  ).resolves.toMatchObject({ consumedAt: null });
});

test("logout invalida la sesión persistida y el token capturado no se puede reutilizar", async ({
  page,
}) => {
  const fixture = await createCaregiverFixture();
  const profile = await prisma.caregiverProfile.upsert({
    where: { caregiverUserId: fixture.caregiverUser.id },
    create: {
      caregiverUserId: fixture.caregiverUser.id,
      externalPseudonymousId: `cg_${randomBytes(12).toString("hex")}`,
    },
    update: {},
  });
  await prisma.caregiverAuthorizationScope.create({
    data: {
      caregiverAuthorizationId: fixture.authorization.id,
      dischargeEpisodeId: fixture.episode.id,
      version: 1,
      capabilities: [],
      allowedPlanSections: [],
      authorizedResourceKeys: [],
      actorUserId: fixture.patientUser.id,
    },
  });
  const validToken = randomBytes(32).toString("base64url");
  const invitation = await prisma.caregiverInvitation.create({
    data: {
      caregiverAuthorizationId: fixture.authorization.id,
      caregiverProfileId: profile.id,
      dischargeEpisodeId: fixture.episode.id,
      invitationTokenHash: sha256(validToken),
      createdById: fixture.patientUser.id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  await startDemo(page, "demo-caregiver");
  await page.getByLabel("Token de invitación local").fill(validToken);
  await page.getByRole("button", { name: "Aceptar como cuidador autenticado" }).click();
  await expect(page.getByText(/Portal limitado actualizado/)).toBeVisible();
  const cookie = (await page.context().cookies()).find(
    ({ name }) => name === "guardian_caregiver_session",
  );
  expect(cookie?.value).toBeTruthy();

  const logoutStatus = await page.evaluate(async () =>
    fetch("/api/demo/caregiver/portal", { method: "DELETE" }).then((response) => response.status),
  );
  expect(logoutStatus).toBe(204);
  const replay = await page.request.get("/api/demo/caregiver/portal", {
    headers: { Cookie: `guardian_caregiver_session=${cookie!.value}` },
  });
  expect(replay.status()).toBe(401);

  const session = await prisma.caregiverSession.findUniqueOrThrow({
    where: { invitationId: invitation.id },
  });
  expect(session.revokedAt).not.toBeNull();
  await expect(
    prisma.caregiverAccessAudit.count({
      where: { caregiverSessionId: session.id, action: "SESSION_LOGGED_OUT" },
    }),
  ).resolves.toBe(1);
});

test("acepta acceso limitado y la revocación corta la sesión sin borrar observaciones", async ({
  page,
}) => {
  const { episode, authorization } = await createCaregiverFixture();

  await startDemo(page, "demo-patient");
  await page.goto("/authorized-people");
  await page.getByRole("button", { name: "Consultar autorizaciones" }).click();
  await page.getByLabel("Autorización explícita").selectOption(authorization.id);
  await page.getByLabel("Episodio", { exact: true }).selectOption(episode.id);
  await page.getByRole("button", { name: "Crear invitación local" }).click();
  const token = await page.locator(".local-invitation code").textContent();
  expect(token).toMatch(/^[A-Za-z0-9_-]{40,64}$/u);

  await startDemo(page, "demo-caregiver");
  await page.getByLabel("Token de invitación local").fill(token!);
  await page.getByRole("button", { name: "Aceptar como cuidador autenticado" }).click();
  await expect(page.getByText(/Portal limitado actualizado/)).toBeVisible();
  await page
    .getByLabel("Observación para revisión humana")
    .fill("Observación sintética e2e para revisión humana");
  await page.getByRole("button", { name: "Enviar observación" }).click();
  await expect(page.getByText(/no se ha creado una alerta/i)).toBeVisible();

  await startDemo(page, "demo-patient");
  await page.goto("/authorized-people");
  await page.getByRole("button", { name: "Consultar autorizaciones" }).click();
  await page.getByLabel("Autorización explícita").selectOption(authorization.id);
  await page.getByRole("button", { name: "Revocar acceso y sesiones" }).click();
  await expect(page.getByText(/todas las sesiones activas han quedado invalidadas/i)).toBeVisible();
  const revokedPortal = await page.request.get("/api/demo/caregiver/portal");
  expect(revokedPortal.status()).toBe(401);

  await expect(
    prisma.caregiverObservation.count({
      where: { caregiverAuthorizationId: authorization.id },
    }),
  ).resolves.toBe(1);
  await expect(prisma.alert.count({ where: { episodeId: episode.id } })).resolves.toBe(0);
});
