import { createHash, randomBytes, randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { PrismaClient } from "@prisma/client";
import { request as apiRequest, type Page } from "@playwright/test";

import { expect, test } from "../support/p14-playwright";

const prisma = new PrismaClient();
const baseURL = "http://127.0.0.1:3000";
const sessionCookieName = "guardian_demo_session";

type FixedDemoAlias =
  | "demo-admin"
  | "demo-nurse"
  | "demo-clinician"
  | "demo-patient"
  | "demo-caregiver"
  | "demo-support";

const roleLandings: readonly {
  readonly alias: FixedDemoAlias;
  readonly destination: RegExp;
  readonly heading: string;
}[] = [
  { alias: "demo-nurse", destination: /\/dashboard$/u, heading: "Buenos días" },
  { alias: "demo-clinician", destination: /\/dashboard$/u, heading: "Buenos días" },
  {
    alias: "demo-patient",
    destination: /\/my-follow-up$/u,
    heading: "Tu información, en un lugar claro",
  },
  { alias: "demo-caregiver", destination: /\/caregiver$/u, heading: "Contenido autorizado" },
  { alias: "demo-admin", destination: /\/admin$/u, heading: "Configuración" },
  { alias: "demo-support", destination: /\/support$/u, heading: "Estado técnico" },
];

async function login(page: Page, alias: FixedDemoAlias, destination: RegExp): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Usuario demo").selectOption(alias);
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  await expect(page).toHaveURL(destination);
}

async function expectNoMaterialAxeViolations(page: Page, view: string): Promise<void> {
  await page.waitForFunction(() => document.title.trim().length > 0);
  const results = await new AxeBuilder({ page }).analyze();
  const material = results.violations
    .filter(({ impact }) => impact === "serious" || impact === "critical")
    .map((violation) => ({
      view,
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      affectedNodes: violation.nodes.length,
      targets: violation.nodes.slice(0, 3).flatMap(({ target }) => target),
    }));
  expect(material, `Violaciones axe serious/critical en ${view}`).toEqual([]);
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("login demo tiene orden de foco observable y no presenta violaciones axe materiales", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("DEMO SINTÉTICA · NO USO CLÍNICO", { exact: true })).toBeVisible();
  await expectNoMaterialAxeViolations(page, "login demo");

  const selector = page.getByLabel("Usuario demo");
  await selector.focus();
  await expect(selector).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "INICIAR DEMO" })).toBeFocused();
});

for (const landing of roleLandings) {
  test(`${landing.alias} muestra el badge y no presenta violaciones axe materiales`, async ({
    page,
  }) => {
    await login(page, landing.alias, landing.destination);
    await expect(page.getByRole("heading", { name: landing.heading })).toBeVisible();
    await expect(page.getByText("DEMO SINTÉTICA · NO USO CLÍNICO", { exact: true })).toBeVisible();
    await expectNoMaterialAxeViolations(page, landing.alias);
  });
}

test("vistas críticas de paciente mantienen nombres, roles y contraste automatizable", async ({
  page,
}) => {
  await login(page, "demo-patient", /\/my-follow-up$/u);
  const views = [
    ["/my-plan", "Mi Plan"],
    ["/my-check-ins", "Mis Check-ins"],
    ["/authorized-people", "Personas autorizadas"],
  ] as const;

  for (const [path, heading] of views) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expectNoMaterialAxeViolations(page, `patient ${path}`);
  }
});

test("paneles profesionales críticos mantienen accesibilidad automatizada", async ({ page }) => {
  await login(page, "demo-nurse", /\/dashboard$/u);
  const views = [
    ["/dashboard", "Buenos días"],
    ["/episodes", "Episodios"],
    ["/alerts", "Lista de avisos"],
    ["/workqueue", "Cola de seguimiento"],
  ] as const;

  for (const [path, heading] of views) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expectNoMaterialAxeViolations(page, `nurse ${path}`);
  }
});

for (const denial of [
  { alias: "demo-patient", pagePath: "/dashboard", apiPath: "/api/demo/discharge-episodes" },
  { alias: "demo-caregiver", pagePath: "/episodes", apiPath: "/api/demo/discharge-episodes" },
  { alias: "demo-admin", pagePath: "/episodes", apiPath: "/api/demo/safety-plans" },
  { alias: "demo-support", pagePath: "/my-plan", apiPath: "/api/demo/safety-plans" },
] as const) {
  test(`${denial.alias} recibe denegación coherente por URL directa y API real`, async ({
    page,
  }) => {
    await login(
      page,
      denial.alias,
      roleLandings.find(({ alias }) => alias === denial.alias)!.destination,
    );
    const response = await page.request.get(denial.apiPath);
    expect(response.status()).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "FORBIDDEN" } });

    await page.goto(denial.pagePath);
    await expect(
      page.getByRole("heading", { name: "Esta sección no corresponde a tu rol" }),
    ).toBeVisible();
    await expectNoMaterialAxeViolations(page, `${denial.alias} unauthorized state`);
  });
}

test("support no puede consultar superficies clínicas reales y recibe errores sanitizados", async ({
  page,
}) => {
  await login(page, "demo-support", /\/support$/u);
  const endpoints = [
    "/api/demo/discharge-episodes",
    "/api/demo/safety-plans",
    "/api/demo/check-ins",
    "/api/demo/rules",
    "/api/demo/alerts",
    "/api/demo/nursing-workqueue",
    "/api/demo/operational-continuity",
    "/api/demo/caregiver-access",
    "/api/demo/legal-records?subject=demo-patient",
  ];

  for (const endpoint of endpoints) {
    const response = await page.request.get(endpoint);
    expect(response.status(), endpoint).toBe(403);
    const body = (await response.json()) as {
      readonly error: {
        readonly code: string;
        readonly message: string;
        readonly correlationId: string;
      };
    };
    expect(body.error).toMatchObject({ code: "FORBIDDEN", message: "Acceso denegado." });
    expect(body.error.correlationId).toMatch(/^[0-9a-f-]{36}$/iu);
    expect(JSON.stringify(body)).not.toMatch(
      /diagn[oó]st|nota cl[ií]nica|check-in response|stack|secret/iu,
    );
  }
});

test("un profesional no puede leer ni mutar un episodio al que no está asignado", async ({
  page,
}) => {
  const suffix = randomUUID();
  const admin = await prisma.user.findUniqueOrThrow({ where: { syntheticAlias: "demo-admin" } });
  const [patient, protocol] = await Promise.all([
    prisma.patient.findUniqueOrThrow({ where: { externalPseudonymousId: "SYNTH-PATIENT-001" } }),
    prisma.checkInProtocolVersion.findFirstOrThrow({
      where: { protocolKey: "synthetic-check-in-template", isSyntheticFixture: true },
      orderBy: { versionNumber: "desc" },
    }),
  ]);
  const foreignNurse = await prisma.user.create({
    data: {
      syntheticAlias: `p14-nurse-${suffix}`,
      displayLabel: "SINTÉTICO / NO USO CLÍNICO — nurse aislado P14",
      isSynthetic: true,
      roleAssignments: { create: { role: "nurse", assignedById: admin.id } },
    },
  });
  const foreignClinician = await prisma.user.create({
    data: {
      syntheticAlias: `p14-clinician-${suffix}`,
      displayLabel: "SINTÉTICO / NO USO CLÍNICO — clinician aislado P14",
      isSynthetic: true,
      roleAssignments: { create: { role: "clinician", assignedById: admin.id } },
    },
  });
  const episode = await prisma.dischargeEpisode.create({
    data: {
      patientId: patient.id,
      dischargeDate: new Date("2026-08-01T00:00:00.000Z"),
      programLengthDays: 30,
      responsibleNurseId: foreignNurse.id,
      responsibleClinicianId: foreignClinician.id,
      status: "DRAFT",
      createdById: foreignNurse.id,
      checkInProtocolVersionId: protocol.id,
    },
  });

  await login(page, "demo-nurse", /\/dashboard$/u);
  const detail = await page.request.get(`/api/demo/discharge-episodes/${episode.id}`);
  expect(detail.status()).toBe(403);
  const detailBody = (await detail.json()) as {
    readonly error: {
      readonly code: string;
      readonly message: string;
      readonly correlationId: string;
    };
  };
  expect(detailBody.error).toMatchObject({ code: "FORBIDDEN", message: "Acceso denegado." });
  expect(detailBody.error.correlationId).toMatch(/^[0-9a-f-]{36}$/iu);
  expect(JSON.stringify(detailBody)).not.toMatch(
    new RegExp(
      `${patient.externalPseudonymousId}|diagn[oó]st|nota cl[ií]nica|stack|internal|secret`,
      "iu",
    ),
  );
  const mutation = await page.request.patch(`/api/demo/discharge-episodes/${episode.id}`, {
    headers: { Origin: baseURL, "Idempotency-Key": `p14-denied:${randomUUID()}` },
    data: { targetStatus: "ACTIVE", expectedVersion: 1 },
  });
  expect(mutation.status()).toBe(403);
  await expect(
    prisma.dischargeEpisode.findUniqueOrThrow({ where: { id: episode.id } }),
  ).resolves.toMatchObject({ status: "DRAFT", version: 1 });

  await page.goto(`/episodes/${episode.id}`);
  await expect(page.locator(".error-state")).toContainText(
    "El episodio no está disponible para esta identidad profesional.",
  );
  await expect(page.getByText("SYNTH-PATIENT-001")).toHaveCount(0);
});

test("un paciente no ve ni puede responder el check-in de otro episodio", async ({ page }) => {
  const suffix = randomUUID();
  const [admin, policy, protocol] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { syntheticAlias: "demo-admin" } }),
    prisma.identityVerificationPolicyVersion.findFirstOrThrow({ where: { isSyntheticDemo: true } }),
    prisma.checkInProtocolVersion.findFirstOrThrow({
      where: { protocolKey: "synthetic-check-in-template", isSyntheticFixture: true },
      orderBy: { versionNumber: "desc" },
    }),
  ]);
  const foreignPortalUser = await prisma.user.create({
    data: {
      syntheticAlias: `p14-patient-${suffix}`,
      displayLabel: "SINTÉTICO / NO USO CLÍNICO — patient aislado P14",
      isSynthetic: true,
      roleAssignments: { create: { role: "patient", assignedById: admin.id } },
    },
  });
  const foreignNurse = await prisma.user.create({
    data: {
      syntheticAlias: `p14-patient-nurse-${suffix}`,
      displayLabel: "SINTÉTICO / NO USO CLÍNICO — nurse de episodio ajeno P14",
      isSynthetic: true,
      roleAssignments: { create: { role: "nurse", assignedById: admin.id } },
    },
  });
  const foreignClinician = await prisma.user.create({
    data: {
      syntheticAlias: `p14-patient-clinician-${suffix}`,
      displayLabel: "SINTÉTICO / NO USO CLÍNICO — clinician de episodio ajeno P14",
      isSynthetic: true,
      roleAssignments: { create: { role: "clinician", assignedById: admin.id } },
    },
  });
  const foreignPatient = await prisma.patient.create({
    data: {
      externalPseudonymousId: `SYNTH-P14-${suffix}`,
      isSynthetic: true,
      identityVerificationState: "VERIFIED",
      identityVerificationPolicyVersionId: policy.id,
      identityVerifiedAt: new Date(),
      identityVerifiedById: foreignNurse.id,
      createdById: foreignNurse.id,
      portalUserId: foreignPortalUser.id,
    },
  });
  const episode = await prisma.dischargeEpisode.create({
    data: {
      patientId: foreignPatient.id,
      dischargeDate: new Date("2026-08-02T00:00:00.000Z"),
      programLengthDays: 30,
      responsibleNurseId: foreignNurse.id,
      responsibleClinicianId: foreignClinician.id,
      status: "ACTIVE",
      createdById: foreignNurse.id,
      checkInProtocolVersionId: protocol.id,
    },
  });
  const batch = await prisma.checkInAssignmentBatch.create({
    data: {
      episodeId: episode.id,
      checkInProtocolVersionId: protocol.id,
      createdById: foreignNurse.id,
      idempotencyKey: `p14-batch:${suffix}`,
      requestFingerprint: createHash("sha256").update(suffix).digest("hex"),
    },
  });
  const assignment = await prisma.checkInAssignment.create({
    data: {
      batchId: batch.id,
      episodeId: episode.id,
      checkInProtocolVersionId: protocol.id,
      sequence: 1,
      scheduledFor: new Date(),
      windowStartsAt: new Date(Date.now() - 60_000),
      windowEndsAt: new Date(Date.now() + 60_000),
      createdById: foreignNurse.id,
    },
  });

  await login(page, "demo-patient", /\/my-follow-up$/u);
  const visible = (await (await page.request.get("/api/demo/check-ins")).json()) as {
    readonly assignments: readonly { readonly id: string }[];
  };
  expect(visible.assignments.map(({ id }) => id)).not.toContain(assignment.id);
  expect((await page.request.get(`/api/demo/discharge-episodes/${episode.id}`)).status()).toBe(403);
  const response = await page.request.post(`/api/demo/check-ins/${assignment.id}/response`, {
    headers: { Origin: baseURL, "Idempotency-Key": `p14-patient-denied:${randomUUID()}` },
    data: { answers: [] },
  });
  expect(response.status()).toBe(403);
  await expect(
    prisma.checkInOutcome.findUnique({ where: { assignmentId: assignment.id } }),
  ).resolves.toBeNull();
});

test("caregiver no puede ampliar su alcance desde el cliente", async ({ page }) => {
  await login(page, "demo-caregiver", /\/caregiver$/u);
  const scopeCount = await prisma.caregiverAuthorizationScope.count();
  const response = await page.request.post("/api/demo/caregiver-access", {
    headers: { Origin: baseURL },
    data: {
      action: "change-scope",
      caregiverAuthorizationId: randomUUID(),
      episodeId: randomUUID(),
      expectedVersion: 1,
      scope: {
        capabilities: ["VIEW_PLAN_SECTIONS", "VIEW_ASSIGNED_TASKS", "SEND_OBSERVATIONS"],
        allowedPlanSections: ["MEANS_REDUCTION"],
        authorizedResourceKeys: [],
      },
    },
  });
  expect(response.status()).toBe(403);
  await expect(prisma.caregiverAuthorizationScope.count()).resolves.toBe(scopeCount);
});

test("admin no puede autoasignarse una capacidad clínica", async ({ page }) => {
  const admin = await prisma.user.findUniqueOrThrow({ where: { syntheticAlias: "demo-admin" } });
  await login(page, "demo-admin", /\/admin$/u);
  const response = await page.request.post("/api/admin/role-assignments", {
    headers: { Origin: baseURL },
    data: { targetUserId: admin.id, role: "nurse" },
  });
  expect(response.status()).toBe(403);
  await expect(
    prisma.roleAssignment.findFirst({
      where: { userId: admin.id, role: "nurse", revokedAt: null },
    }),
  ).resolves.toBeNull();
});

test("una sesión expirada se rechaza aunque se reproduzca su cookie", async () => {
  const patient = await prisma.user.findUniqueOrThrow({
    where: { syntheticAlias: "demo-patient" },
  });
  const rawToken = randomBytes(32).toString("base64url");
  const session = await prisma.sessionMetadata.create({
    data: {
      userId: patient.id,
      sessionTokenHash: createHash("sha256").update(rawToken).digest("hex"),
      authenticationMethod: "demo-local",
      correlationId: randomUUID(),
      userAgentHash: null,
      expiresAt: new Date(Date.now() - 1),
    },
  });
  const context = await apiRequest.newContext({
    baseURL,
    extraHTTPHeaders: { Cookie: `${sessionCookieName}=${rawToken}` },
  });
  try {
    const response = await context.get("/api/demo/resources/authenticated-session");
    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "UNAUTHENTICATED" } });
  } finally {
    await context.dispose();
    await prisma.sessionMetadata.delete({ where: { id: session.id } });
  }
});
