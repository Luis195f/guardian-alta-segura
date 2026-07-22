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
  await page.getByRole("tab", { name: "Historial" }).click();
  await expect(page.getByRole("heading", { name: "Historial del episodio" })).toBeVisible();
  await expect(page.getByText("Activo", { exact: true }).last()).toBeVisible();
});
