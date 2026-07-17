import { expect, test } from "@playwright/test";

test("crea, activa, versiona y compara un Plan de Seguridad sin sobrescribir historial", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Usuario sintético").selectOption("demo-nurse");
  await page.getByRole("button", { name: "Iniciar sesión sintética" }).click();
  await expect(page.getByText(/Sesión demo sintética iniciada/)).toBeVisible();

  await page.getByLabel("Fecha de alta").fill("2026-07-17");
  await page.getByRole("button", { name: "Crear borrador" }).click();
  await expect(
    page.getByRole("heading", { name: "Plan de Seguridad Stanley-Brown" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Cargar plan e historial" }).click();
  await page.getByRole("button", { name: "Crear primera versión" }).click();
  const contents = page.getByLabel("Contenido sintético");
  await expect(contents).toHaveCount(6);
  for (let index = 0; index < 6; index += 1) {
    await contents.nth(index).fill(`Paso sintético ${index + 1}, revisión humana`);
  }
  await page.getByRole("button", { name: "Revisar los seis pasos" }).click();
  await page.getByRole("button", { name: "Guardar como versión nueva" }).click();
  await expect(page.getByText(/v1 — Borrador/)).toBeVisible();

  await page.getByRole("button", { name: "Activar v1" }).click();
  await expect(page.getByText(/v1 — Activa/)).toBeVisible();

  await page.getByRole("button", { name: "Crear nueva versión" }).click();
  await page.getByLabel("Contenido sintético").first().fill("Señal sintética actualizada en v2");
  await page.getByRole("button", { name: "Revisar los seis pasos" }).click();
  await page.getByRole("button", { name: "Guardar como versión nueva" }).click();

  await expect(page.getByText(/v2 — Borrador/)).toBeVisible();
  await expect(page.getByText(/v1 — Activa/)).toBeVisible();
  await expect(page.getByText(/v2: Señal sintética actualizada en v2/)).toBeVisible();
  await expect(page.getByText(/v1: Paso sintético 1, revisión humana/)).toBeVisible();
});
