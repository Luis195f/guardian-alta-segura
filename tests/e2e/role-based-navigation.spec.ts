import { expect, test, type Page } from "@playwright/test";

test.beforeEach(() => {
  test.setTimeout(90_000);
});

async function login(page: Page, alias: string, destination: RegExp) {
  await page.goto("/");
  await page.getByLabel("Usuario demo").selectOption(alias);
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  await expect(page).toHaveURL(destination, { timeout: 30_000 });
}

function collectUnexpectedDenials(page: Page) {
  const denials: string[] = [];
  page.on("response", (response) => {
    if ([401, 403].includes(response.status()))
      denials.push(`${response.status()} ${response.url()}`);
  });
  return denials;
}

test("sin sesión solo muestra la entrada y el selector demo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Guardián Alta Segura" })).toBeVisible();
  await expect(page.getByText("DEMO SINTÉTICA · NO USO CLÍNICO", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "INICIAR DEMO" })).toBeEnabled();
  await expect(page.getByRole("listitem").filter({ hasText: "Alta" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Revisión humana" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lista de avisos" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Cola de seguimiento" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Mi Plan de Seguridad" })).toHaveCount(0);
});

for (const alias of ["demo-nurse", "demo-clinician"]) {
  test(`${alias} ve el flujo profesional sin módulos patient-only`, async ({ page }) => {
    const denials = collectUnexpectedDenials(page);
    await login(page, alias, /\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Buenos días" })).toBeVisible();
    await expect(page.getByText("Episodios activos", { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('aside a[href="/episodes"]')).toBeVisible();
    await expect(page.locator('aside a[href="/alerts"]')).toBeVisible();
    await expect(page.locator('aside a[href="/workqueue"]')).toBeVisible();
    await expect(page.getByRole("link", { name: "Mi Plan" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Configuración" })).toHaveCount(0);
    await page.locator('aside a[href="/episodes"]').click();
    await expect(page.getByRole("heading", { name: "Episodios" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("link", { name: "Abrir episodio" }).first().click({ timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1, name: "SYNTH-PATIENT-001" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("tab", { name: "Resumen" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(denials).toEqual([]);
  });
}

test("patient ve su seguimiento y no superficies profesionales", async ({ page }) => {
  const denials = collectUnexpectedDenials(page);
  await login(page, "demo-patient", /\/my-follow-up$/);
  await expect(
    page.getByRole("heading", { name: "Tu información, en un lugar claro" }),
  ).toBeVisible();
  await expect(page.locator('main a[href="/my-plan"]')).toBeVisible();
  await expect(page.locator('main a[href="/my-check-ins"]')).toBeVisible();
  await expect(page.locator('main a[href="/authorized-people"]')).toBeVisible();
  await expect(page.getByRole("link", { name: "Seguimiento", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Avisos", exact: true })).toHaveCount(0);
  await page.locator('main a[href="/my-plan"]').click();
  await expect(page.getByRole("heading", { name: "Mi Plan de Seguridad" })).toBeVisible();
  await page.locator('aside a[href="/my-check-ins"]').click();
  await expect(page.getByRole("heading", { name: "Tu check-in" })).toBeVisible();
  expect(denials).toEqual([]);
});

test("caregiver aterriza en una restricción clara sin llamadas no autorizadas", async ({
  page,
}) => {
  const denials = collectUnexpectedDenials(page);
  await login(page, "demo-caregiver", /\/caregiver$/);
  await expect(page.getByRole("heading", { name: "Contenido autorizado" })).toBeVisible();
  await expect(page.getByText(/Sin acceso autorizado/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Acceso con invitación" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Episodios" })).toHaveCount(0);
  expect(denials).toEqual([]);
});

test("admin solo ve configuración demo", async ({ page }) => {
  const denials = collectUnexpectedDenials(page);
  await login(page, "demo-admin", /\/admin$/);
  await expect(page.getByRole("heading", { name: "Configuración" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Protocolos de check-in versionados" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reglas deterministas" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Episodios" })).toHaveCount(0);
  await expect(page.getByText("SYNTH-PATIENT-001")).toHaveCount(0);
  expect(denials).toEqual([]);
});

test("support solo ve estado técnico sanitizado", async ({ page }) => {
  const denials = collectUnexpectedDenials(page);
  await login(page, "demo-support", /\/support$/);
  await expect(page.getByRole("heading", { name: "Estado técnico" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Servicio local" })).toBeVisible();
  await expect(page.getByText("Operativo", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Episodios" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Mi Plan" })).toHaveCount(0);
  expect(denials).toEqual([]);
});
