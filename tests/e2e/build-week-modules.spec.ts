import { expect, test } from "@playwright/test";

test("muestra crisis fail-closed y permite Domicilio Seguro y SBAR sintéticos", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Recurso de crisis no configurado — pendiente de protocolo local."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Recurso no disponible" })).toBeDisabled();

  await page.getByLabel("Usuario sintético").selectOption("demo-nurse");
  await page.getByRole("button", { name: "Iniciar sesión sintética" }).click();
  await expect(page.getByText(/Sesión demo sintética iniciada/)).toBeVisible();
  await page.getByRole("button", { name: "Cargar episodios asignados" }).click();
  await page.locator('[data-episode-id="synthetic-demo-episode-buildweek"]').click();
  await expect(page.getByRole("heading", { name: "Domicilio Seguro" })).toBeVisible();

  await page.getByRole("button", { name: "Cargar historial" }).click();
  await page.getByLabel(/Comprendo que este módulo solo organiza información/).check();
  await page.getByLabel(/Revisión humana registrada/).check();
  await page.getByRole("button", { name: "Guardar nueva versión de Domicilio Seguro" }).click();
  await expect(page.getByText(/Nueva versión append-only registrada/)).toBeVisible();
  await expect(page.getByText(/Versión \d+/).first()).toBeVisible();

  await page.getByRole("button", { name: "Generar preview" }).click();
  await expect(page.getByText("A — Assessment")).toBeVisible();
  await expect(page.getByText(/Sin valoración clínica adicional registrada/)).toBeVisible();
  await expect(page.getByText("Firma:")).toBeVisible();
  await expect(page.getByText("no firmada.")).toBeVisible();
});
