import { expect, test } from "@playwright/test";

test("muestra límites sintéticos y el demo local no productivo", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Guardián Alta Segura" })).toBeVisible();
  await expect(page.getByText("SINTÉTICO / NO USO CLÍNICO", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Modo demo NO PRODUCTIVO" })).toBeVisible();
  await expect(
    page.getByText("Esta rama no contiene decisiones clínicas automatizadas."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Consentimientos, autorizaciones y bases separadas" }),
  ).toBeVisible();
  await expect(
    page.getByText(/La base jurídica configurada para el tratamiento asistencial no equivale/),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar sesión sintética" })).toBeEnabled();

  await page.getByLabel("Usuario sintético").selectOption("demo-patient");
  await page.getByRole("button", { name: "Iniciar sesión sintética" }).click();
  await expect(page.getByText(/Sesión demo sintética iniciada/)).toBeVisible();
  await page.getByRole("button", { name: "Cargar estados de demo-patient" }).click();
  await page.getByLabel("Estado registrado").selectOption("ACTIVE");
  await page.getByRole("button", { name: "Registrar nueva entrada" }).click();
  await expect(
    page.getByText("DENEGADO — política pendiente de validación local").first(),
  ).toBeVisible();
  await expect(page.getByText("DEMO-SYNTHETIC-ACK")).toHaveCount(0);
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
