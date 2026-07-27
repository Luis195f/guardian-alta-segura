import { expect, test } from "@playwright/test";

test("crea, lista, detalla y activa un episodio sintético con timeline", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Usuario demo").selectOption("demo-nurse");
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/episodes/new");

  await page.getByLabel("Fecha de alta").fill("2026-07-16");
  await page.getByLabel("Duración del programa").selectOption("60");
  await page.getByRole("button", { name: "Crear borrador" }).click();

  await expect(page.getByRole("heading", { name: "SYNTH-PATIENT-001" })).toBeVisible();
  await expect(page.getByText("Episodio borrador", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Activar", exact: true }).click();
  await expect(page.getByText("Episodio activo", { exact: true })).toBeVisible();
  await expect(page.getByText(/Transición a activo registrada y auditada/)).toBeVisible();
  await expect(
    page.getByText("DEC-002 pendiente: política institucional de cierre no aprobada"),
  ).toBeVisible();

  const episodeId = new URL(page.url()).pathname.split("/").at(-1);
  expect(episodeId).toBeTruthy();
  const detailResponse = await page.request.get(`/api/demo/discharge-episodes/${episodeId}`);
  expect(detailResponse.ok()).toBe(true);
  const detail = (await detailResponse.json()) as {
    readonly episode: { readonly status: string; readonly version: number };
    readonly governance: {
      readonly openObligations: readonly unknown[];
      readonly blockers: readonly { readonly code: string }[];
      readonly transitionDecision: { readonly authorization: string };
    };
  };
  expect(detail.governance.transitionDecision.authorization).toBe("NOT_AUTHORIZED");
  expect(detail.governance.blockers.map(({ code }) => code)).toContain(
    "DEC_002_EPISODE_CLOSURE_POLICY_PENDING",
  );

  const closeResponse = await page.request.patch(`/api/demo/discharge-episodes/${episodeId}`, {
    headers: {
      Origin: new URL(page.url()).origin,
      "Idempotency-Key": `close-e2e:${crypto.randomUUID()}`,
    },
    data: {
      targetStatus: "CLOSED",
      expectedVersion: detail.episode.version,
      reason: "Cierre organizativo sintético revisado",
    },
  });
  expect(closeResponse.status()).toBe(409);
  const afterDeniedClose = await page.request.get(`/api/demo/discharge-episodes/${episodeId}`);
  await expect(afterDeniedClose.json()).resolves.toMatchObject({
    episode: { status: "ACTIVE", version: detail.episode.version },
    governance: {
      transitionDecision: { authorization: "NOT_AUTHORIZED" },
    },
  });

  await page.getByRole("tab", { name: "Historial" }).click();
  await expect(page.getByRole("heading", { name: "Historial del episodio" })).toBeVisible();
  await expect(page.getByText("Activo", { exact: true }).last()).toBeVisible();

  await page.getByRole("tab", { name: "Evidencia / Trazabilidad" }).click();
  await expect(page.getByRole("heading", { name: "Evidencia / Trazabilidad" })).toBeVisible();
  await expect(page.getByText(/Proyección read-only/)).toBeVisible();
  await expect(page.getByText(/No certifica seguridad clínica/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Referencias de auditoría" })).toBeVisible();
  await expect(page.getByRole("button", { name: /exportar/i })).toHaveCount(0);
  const mutationResponse = await page.request.post(
    `/api/demo/discharge-episodes/${episodeId}/governance-evidence`,
    { data: {} },
  );
  expect(mutationResponse.status()).toBe(405);
});

test("un rol patient no puede consultar la evidencia profesional", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Usuario demo").selectOption("demo-patient");
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  await expect(page).toHaveURL(/\/my-follow-up$/);

  const response = await page.request.get(
    "/api/demo/discharge-episodes/synthetic-inaccessible/governance-evidence",
  );
  expect(response.status()).toBe(403);
});
