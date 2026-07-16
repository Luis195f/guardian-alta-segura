import { expect, test } from "@playwright/test";

test("crea, lista, detalla y activa un episodio sintético con timeline", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Usuario sintético").selectOption("demo-nurse");
  await page.getByRole("button", { name: "Iniciar sesión sintética" }).click();
  await expect(page.getByText(/Sesión demo sintética iniciada/)).toBeVisible();

  await page.getByLabel("Fecha de alta").fill("2026-07-16");
  await page.getByLabel("Duración del programa").selectOption("60");
  await page.getByRole("button", { name: "Crear borrador" }).click();

  await expect(page.getByRole("heading", { name: "Detalle: SYNTH-PATIENT-001" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Borrador", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Creación → Borrador/)).toBeVisible();

  await page.getByRole("button", { name: "Activar", exact: true }).click();
  await expect(page.getByText("Activo", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Borrador → Activo/)).toBeVisible();
  await expect(page.getByText(/Transición a activo registrada y auditada/)).toBeVisible();
});
