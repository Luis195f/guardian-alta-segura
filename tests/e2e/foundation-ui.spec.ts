import { expect, test } from "@playwright/test";

test("muestra límites sintéticos y el demo local no productivo", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Guardián Alta Segura" })).toBeVisible();
  await expect(page.getByText("SINTÉTICO / NO USO CLÍNICO", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Modo demo NO PRODUCTIVO" })).toBeVisible();
  await expect(page.getByText("Esta rama no contiene módulos clínicos.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar sesión sintética" })).toBeEnabled();
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
