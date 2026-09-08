import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { prisma } from "../../src/infrastructure/persistence/prisma";
import { SyntheticDemoPatientRelayAuthority } from "../../src/infrastructure/relay/synthetic-demo-patient-relay";

const EPISODE_ID = "synthetic-demo-episode-buildweek";
const SYNTHETIC_PHONE = ["+", "34", "600", "000", "001"].join("");
const ADVERSARIAL_MARKERS = [
  "synthetic-c07-api-key-marker",
  "synthetic-c07-clear-token-marker",
  "synthetic-c07-prompt-injection-marker",
  "synthetic-c07-transcript-turns-marker",
  "synthetic-c07-transcript-marker",
  "synthetic-c07-summary-marker",
  "synthetic-c07-evidence-marker",
  "synthetic-c07-completion-confidence-marker",
  "synthetic-c07-free-metadata-marker",
  "synthetic-c07-raw-call-marker",
  "synthetic-c07-raw-payload-marker",
  "synthetic-c07-provider-body-marker",
] as const;

type DemoAlias = "demo-admin" | "demo-nurse" | "demo-patient" | "demo-caregiver" | "demo-support";

async function login(page: Page, alias: DemoAlias): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Usuario demo").selectOption(alias);
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  await expect(page).not.toHaveURL(/\/$/u);
}

async function postPreview(page: Page, kind: "patient" | "professional", data: object = {}) {
  return page.request.post(`/api/demo/discharge-episodes/${EPISODE_ID}/${kind}-relay/preview`, {
    headers: { Origin: new URL(page.url()).origin },
    data,
  });
}

async function expectNoMaterialAxeViolations(page: Page, view: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const material = results.violations
    .filter(({ impact }) => impact === "serious" || impact === "critical")
    .map(({ id, impact, help, nodes }) => ({
      view,
      id,
      impact,
      help,
      affectedNodes: nodes.length,
      targets: nodes.slice(0, 3).flatMap(({ target }) => target),
    }));
  expect(material, `Violaciones axe serious/critical en ${view}`).toEqual([]);
}

function artifactText(root: string): string {
  if (!existsSync(root)) return "";
  return readdirSync(root, { withFileTypes: true })
    .map((entry) => {
      const target = path.join(root, entry.name);
      if (entry.isDirectory()) return artifactText(target);
      if (!statSync(target).isFile()) return "";
      return readFileSync(target).toString("utf8");
    })
    .join("\n");
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("C07 niega aislamiento horizontal, escalada vertical y destinatarios del cliente sin efectos", async ({
  browser,
}) => {
  const before = await Promise.all([
    prisma.relayAttempt.count(),
    prisma.outboundCallIntent.count(),
    prisma.relayEvent.count(),
  ]);

  for (const alias of ["demo-patient", "demo-caregiver", "demo-support", "demo-admin"] as const) {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await login(page, alias);
      const patient = await postPreview(page, "patient");
      const professional = await postPreview(page, "professional");
      expect(patient.status()).toBe(403);
      expect(professional.status()).toBe(403);
    } finally {
      await context.close();
    }
  }

  const nurseContext = await browser.newContext();
  try {
    const page = await nurseContext.newPage();
    await login(page, "demo-nurse");
    const origin = new URL(page.url()).origin;
    const sourceEpisode = await prisma.dischargeEpisode.findUniqueOrThrow({
      where: { id: EPISODE_ID },
    });
    const otherEpisodeId = `synthetic-c07-other-episode-${randomUUID()}`;
    await prisma.dischargeEpisode.create({
      data: {
        id: otherEpisodeId,
        patientId: sourceEpisode.patientId,
        dischargeDate: sourceEpisode.dischargeDate,
        programLengthDays: sourceEpisode.programLengthDays,
        responsibleNurseId: sourceEpisode.responsibleNurseId,
        responsibleClinicianId: sourceEpisode.responsibleClinicianId,
        createdById: sourceEpisode.createdById,
        checkInProtocolVersionId: sourceEpisode.checkInProtocolVersionId,
        status: "ACTIVE",
      },
    });
    const isolated = await page.request.post(
      `/api/demo/discharge-episodes/${otherEpisodeId}/patient-relay/preview`,
      { headers: { Origin: origin }, data: {} },
    );
    expect(isolated.status()).toBe(503);

    for (const kind of ["patient", "professional"] as const) {
      const override = await postPreview(page, kind, {
        professionalId: "client-selected-professional",
        targetRef: "client-selected-target",
        recipients: [{ phones: [SYNTHETIC_PHONE, SYNTHETIC_PHONE] }],
        CALLE_API_KEY: ADVERSARIAL_MARKERS[0],
        token: ADVERSARIAL_MARKERS[1],
        prompt: ADVERSARIAL_MARKERS[2],
        transcriptTurns: [ADVERSARIAL_MARKERS[3]],
        transcript: ADVERSARIAL_MARKERS[4],
        summary: ADVERSARIAL_MARKERS[5],
        evidence: ADVERSARIAL_MARKERS[6],
        completionConfidence: ADVERSARIAL_MARKERS[7],
        metadata: { free: ADVERSARIAL_MARKERS[8] },
        Call: { raw: ADVERSARIAL_MARKERS[9] },
        payload: { raw: ADVERSARIAL_MARKERS[10] },
        providerBody: ADVERSARIAL_MARKERS[11],
      });
      expect(override.status()).toBe(400);
      const body = JSON.stringify(await override.json());
      for (const marker of ADVERSARIAL_MARKERS) expect(body).not.toContain(marker);
      expect(body).not.toContain(SYNTHETIC_PHONE);
    }
  } finally {
    await nurseContext.close();
  }

  await expect(
    Promise.all([
      prisma.relayAttempt.count(),
      prisma.outboundCallIntent.count(),
      prisma.relayEvent.count(),
    ]),
  ).resolves.toEqual(before);
});

test("C07 revoca el rol entre preview y confirmación y revalida la autoridad antes del executor", async ({
  page,
}) => {
  await login(page, "demo-nurse");
  const preview = await postPreview(page, "patient");
  expect(preview.status()).toBe(201);
  const previewBody = (await preview.json()) as Record<string, unknown>;
  expect(previewBody).toMatchObject({
    region: "ES",
    locale: "es-ES",
    lineRegion: "SYNTHETIC_LOCAL_NO_PROVIDER",
    providerContacted: false,
  });
  const attempt = await prisma.relayAttempt.findFirstOrThrow({
    where: { episodeRef: EPISODE_ID, recipientKind: "PATIENT" },
    orderBy: { createdAt: "desc" },
  });
  const actorRole = await prisma.roleAssignment.findFirstOrThrow({
    where: { userId: attempt.actorRef, role: "nurse", revokedAt: null },
  });
  await expect(
    prisma.patient.findUniqueOrThrow({
      where: { id: attempt.targetRef },
      select: { identityVerifiedAt: true },
    }),
  ).resolves.toMatchObject({ identityVerifiedAt: expect.any(Date) });
  const outboundBefore = await prisma.outboundCallIntent.count();

  await prisma.roleAssignment.update({
    where: { id: actorRole.id },
    data: { revokedAt: new Date() },
  });
  try {
    const previousDemoMode = process.env.DEMO_MODE;
    const previousBaseUrl = process.env.APP_BASE_URL;
    process.env.DEMO_MODE = "true";
    process.env.APP_BASE_URL = "http://127.0.0.1:3000";
    try {
      await expect(
        new SyntheticDemoPatientRelayAuthority().resolve({
          actor: { userId: attempt.actorRef, roles: ["nurse"], sessionId: "synthetic-c07-session" },
          recipientKind: "PATIENT",
          purpose: "PATIENT_CALLBACK_OFFER",
          context: { episodeRef: EPISODE_ID, taskRef: null },
        }),
      ).resolves.toBeNull();
    } finally {
      if (previousDemoMode === undefined) delete process.env.DEMO_MODE;
      else process.env.DEMO_MODE = previousDemoMode;
      if (previousBaseUrl === undefined) delete process.env.APP_BASE_URL;
      else process.env.APP_BASE_URL = previousBaseUrl;
    }

    const confirmation = await page.request.post(
      `/api/demo/discharge-episodes/${EPISODE_ID}/patient-relay/confirm`,
      { headers: { Origin: new URL(page.url()).origin }, data: {} },
    );
    expect(confirmation.status()).toBe(401);
    await expect(prisma.outboundCallIntent.count()).resolves.toBe(outboundBefore);
    await expect(
      prisma.relayAttempt.findUniqueOrThrow({ where: { id: attempt.id } }),
    ).resolves.toMatchObject({
      lifecycleState: "PREVIEWED",
      consumedAt: null,
    });
  } finally {
    await prisma.roleAssignment.update({ where: { id: actorRole.id }, data: { revokedAt: null } });
  }
});

test("C07 protege el fingerprint y contiene concurrencia, doble clic y replay", async ({
  page,
}) => {
  await login(page, "demo-nurse");
  const preview = await postPreview(page, "professional");
  expect(preview.status()).toBe(201);
  const attempt = await prisma.relayAttempt.findFirstOrThrow({
    where: { episodeRef: EPISODE_ID, recipientKind: "PROFESSIONAL" },
    orderBy: { createdAt: "desc" },
  });
  const outboundBefore = await prisma.outboundCallIntent.count();

  await expect(
    prisma.relayAttempt.update({
      where: { id: attempt.id },
      data: { authorityFingerprint: "0".repeat(64) },
    }),
  ).rejects.toThrow();
  const confirmationUrl = `/api/demo/discharge-episodes/${EPISODE_ID}/professional-relay/confirm`;
  const requestOptions = { headers: { Origin: new URL(page.url()).origin }, data: {} };
  const concurrent = await Promise.all([
    page.request.post(confirmationUrl, requestOptions),
    page.request.post(confirmationUrl, requestOptions),
  ]);
  expect(concurrent.map((response) => response.status()).sort()).toEqual([200, 409]);
  await expect(prisma.outboundCallIntent.count()).resolves.toBe(outboundBefore + 1);
  await expect(
    prisma.relayEvent.count({
      where: { attemptRef: attempt.id, toState: "RESULT_COMPLETED" },
    }),
  ).resolves.toBe(1);
  await expect(
    prisma.auditEvent.count({
      where: { resourceId: attempt.id, action: "RELAY_TECHNICAL_RESULT_AVAILABLE" },
    }),
  ).resolves.toBe(1);

  const replay = await page.request.post(confirmationUrl, requestOptions);
  expect(replay.status()).toBe(409);
  await expect(prisma.outboundCallIntent.count()).resolves.toBe(outboundBefore + 1);
});

test("C07 ejecuta axe y contiene HTML, HTTP, consola, DB y artefactos locales", async ({
  page,
}, testInfo) => {
  const browserSignals: string[] = [];
  page.on("console", (message) => browserSignals.push(message.text()));
  page.on("pageerror", (error) => browserSignals.push(error.message));
  await login(page, "demo-nurse");
  await page.goto(`/episodes/${EPISODE_ID}`);

  for (const name of ["Patient Relay", "Professional Relay"] as const) {
    const tab = page.getByRole("tab", { name });
    await tab.click();
    await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();
    await expectNoMaterialAxeViolations(page, name);
    const html = await page.locator("html").innerHTML();
    expect(html).not.toContain(SYNTHETIC_PHONE);
    for (const marker of ADVERSARIAL_MARKERS) expect(html).not.toContain(marker);
  }

  const databaseProjection = JSON.stringify({
    attempts: await prisma.relayAttempt.findMany(),
    relayEvents: await prisma.relayEvent.findMany(),
    intents: await prisma.outboundCallIntent.findMany(),
    intentEvents: await prisma.outboundCallIntentEvent.findMany(),
    audits: await prisma.auditEvent.findMany({ where: { resourceType: "RelayAttempt" } }),
  });
  expect(databaseProjection).not.toContain(SYNTHETIC_PHONE);
  for (const marker of ADVERSARIAL_MARKERS) {
    expect(databaseProjection).not.toContain(marker);
    expect(browserSignals.join("\n")).not.toContain(marker);
    expect(artifactText(testInfo.outputDir)).not.toContain(marker);
  }
});
