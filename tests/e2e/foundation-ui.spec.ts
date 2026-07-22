import { expect, test } from "@playwright/test";

test("muestra una entrada clara, sintética y responsive", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Guardián Alta Segura" })).toBeVisible();
  await expect(page.getByText("DEMO SINTÉTICA · NO USO CLÍNICO", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Selecciona tu papel en la demo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "INICIAR DEMO" })).toBeEnabled();
  await expect(page.getByRole("listitem").filter({ hasText: "Alta" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Seguimiento" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cuidador: autorización limitada y revocable" }),
  ).toHaveCount(0);
});

test("healthcheck solo devuelve estado técnico", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toEqual({
    status: "ok",
    service: "guardian-alta-segura",
  });
  expect(response.headers()["x-correlation-id"]).toBeTruthy();
  expect(response.headers()["cache-control"]).toBe("no-store");
});

test("ofrece navegación de producto adaptada al viewport", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Usuario demo").selectOption("demo-patient");
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  await expect(page).toHaveURL(/\/my-follow-up$/);

  const isMobile = (page.viewportSize()?.width ?? 1024) <= 768;
  if (isMobile) {
    const menu = page.getByText("Menú", { exact: true });
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(page.getByLabel("Navegación principal móvil")).toBeVisible();
  } else {
    await expect(page.getByLabel("Navegación principal", { exact: true })).toBeVisible();
  }
});
