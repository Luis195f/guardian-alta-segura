import { PrismaClient } from "@prisma/client";
import {
  expect,
  request as apiRequest,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

test.use({ userAgent: "guardian-operational-continuity-e2e/1.0" });

const prisma = new PrismaClient();
const baseURL = "http://127.0.0.1:3000";

interface OperationalItemView {
  readonly sourceType: string;
  readonly resourceId: string;
  readonly episodeId: string;
  readonly sourceState: string;
  readonly sourceUpdatedAt: string | null;
  readonly canonicalHref: string;
}

async function collectOperationalItems(
  context: APIRequestContext,
): Promise<readonly OperationalItemView[]> {
  const items: OperationalItemView[] = [];
  let cursor: string | null = null;
  for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
    const parameters = new URLSearchParams({ pageSize: "25" });
    if (cursor) parameters.set("cursor", cursor);
    const response = await context.get(`/api/demo/operational-continuity?${parameters}`);
    expect(response.status()).toBe(200);
    const payload = (await response.json()) as {
      readonly items: readonly OperationalItemView[];
      readonly page: { readonly hasNextPage: boolean; readonly nextCursor: string | null };
    };
    items.push(...payload.items);
    if (!payload.page.hasNextPage) return items;
    cursor = payload.page.nextCursor;
    expect(cursor).not.toBeNull();
  }
  throw new Error("La proyección sintética excedió el límite técnico de la prueba");
}

async function authenticated(alias: string): Promise<APIRequestContext> {
  const context = await apiRequest.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  const response = await context.post("/api/demo/session", { data: { syntheticAlias: alias } });
  expect(response.status()).toBe(201);
  return context;
}

async function login(page: Page, alias = "demo-nurse") {
  await page.goto("/");
  await page.getByLabel("Usuario demo").selectOption(alias);
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  await expect(page).toHaveURL(alias === "demo-patient" ? /\/my-follow-up$/u : /\/dashboard$/u);
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("API aplica límite, cursor opaco y aislamiento de contexto sin mutar fuentes", async () => {
  const [taskCount, alertCount, auditCount] = await Promise.all([
    prisma.task.count(),
    prisma.alert.count(),
    prisma.auditEvent.count({ where: { action: { not: "DEMO_LOGIN" } } }),
  ]);
  const nurse = await authenticated("demo-nurse");
  const firstResponse = await nurse.get("/api/demo/operational-continuity?pageSize=2");
  expect(firstResponse.status()).toBe(200);
  const first = (await firstResponse.json()) as {
    readonly items: readonly { readonly sourceType: string; readonly resourceId: string }[];
    readonly page: {
      readonly size: number;
      readonly returned: number;
      readonly hasNextPage: boolean;
      readonly truncated: boolean;
      readonly nextCursor: string | null;
    };
  };
  expect(first.page).toMatchObject({ size: 2, returned: 2, hasNextPage: true, truncated: true });
  expect(first.page.nextCursor).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u);
  expect(first.items).toHaveLength(2);

  const secondResponse = await nurse.get(
    `/api/demo/operational-continuity?pageSize=2&cursor=${encodeURIComponent(first.page.nextCursor!)}`,
  );
  expect(secondResponse.status()).toBe(200);
  const second = (await secondResponse.json()) as typeof first;
  const firstKeys = new Set(first.items.map((item) => `${item.sourceType}:${item.resourceId}`));
  expect(
    second.items.every((item) => !firstKeys.has(`${item.sourceType}:${item.resourceId}`)),
  ).toBe(true);

  const [cursorPayload, cursorSignature] = first.page.nextCursor!.split(".");
  const manipulatedSignature = `${cursorSignature!.startsWith("A") ? "B" : "A"}${cursorSignature!.slice(1)}`;
  const manipulated = `${cursorPayload}.${manipulatedSignature}`;
  expect(
    (
      await nurse.get(
        `/api/demo/operational-continuity?pageSize=2&cursor=${encodeURIComponent(manipulated)}`,
      )
    ).status(),
  ).toBe(400);
  expect((await nurse.get("/api/demo/operational-continuity?pageSize=26")).status()).toBe(400);

  const canonicalItems = await collectOperationalItems(nurse);
  const expectedTabs: Readonly<Record<string, string>> = {
    EPISODE: "",
    CHECK_IN: "?tab=check-ins",
    RULE_EVALUATION: "?tab=evidence",
    ALERT: "?tab=alerts",
    ALERT_REVIEW: "?tab=evidence",
    TASK: "?tab=follow-up",
    GOVERNANCE_EVIDENCE: "?tab=evidence",
  };
  expect([...new Set(canonicalItems.map(({ sourceType }) => sourceType))]).toEqual(
    expect.arrayContaining(["EPISODE", "CHECK_IN", "GOVERNANCE_EVIDENCE"]),
  );
  for (const item of canonicalItems) {
    const suffix = expectedTabs[item.sourceType];
    expect(suffix, item.sourceType).toBeDefined();
    expect(item.canonicalHref).toBe(`/episodes/${encodeURIComponent(item.episodeId)}${suffix}`);
  }
  expect(
    canonicalItems.find(({ sourceType }) => sourceType === "GOVERNANCE_EVIDENCE")?.sourceState,
  ).toBe("READ_MODEL_REFERENCE");
  expect(JSON.stringify(canonicalItems)).not.toContain("READ_MODEL_AVAILABLE");

  const clinician = await authenticated("demo-clinician");
  expect(
    (
      await clinician.get(
        `/api/demo/operational-continuity?pageSize=2&cursor=${encodeURIComponent(first.page.nextCursor!)}`,
      )
    ).status(),
  ).toBe(400);
  await expect(
    Promise.all([
      prisma.task.count(),
      prisma.alert.count(),
      prisma.auditEvent.count({ where: { action: { not: "DEMO_LOGIN" } } }),
    ]),
  ).resolves.toEqual([taskCount, alertCount, auditCount]);
  await nurse.dispose();
  await clinician.dispose();
});

test("patient, caregiver, support y admin no acceden al endpoint ni al panel profesional", async ({
  page,
}) => {
  for (const alias of ["demo-patient", "demo-caregiver", "demo-support", "demo-admin"]) {
    const context = await authenticated(alias);
    const response = await context.get("/api/demo/operational-continuity");
    expect(response.status(), alias).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "FORBIDDEN" } });
    await context.dispose();
  }

  await login(page, "demo-patient");
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Esta sección no corresponde a tu rol" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Estado administrativo de fuentes autorizadas" }),
  ).toHaveCount(0);

  const nurse = await authenticated("demo-nurse");
  const authorizedEpisodeId = (await collectOperationalItems(nurse))[0]!.episodeId;
  await nurse.dispose();
  await page.goto(`/episodes/${encodeURIComponent(authorizedEpisodeId)}?tab=evidence`);
  await expect(
    page.getByRole("heading", { name: "Esta sección no corresponde a tu rol" }),
  ).toBeVisible();
});

test("panel expresa incertidumbre, separación semántica y controles accesibles sin acción clínica", async ({
  page,
}) => {
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Estado administrativo de fuentes autorizadas" }),
  ).toBeVisible();
  await expect(page.getByText(/Actualización desconocida/).first()).toBeVisible();
  await expect(page.getByText(/no ordena pacientes por riesgo/)).toBeVisible();
  await expect(page.getByText(/compromisos 5B permanecen/)).toBeVisible();
  await expect(page.getByLabel("Fuentes operativas autorizadas")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Estado administrativo" })).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Actualización de la fuente" }),
  ).toBeVisible();
  await expect(
    page.getByText(/marca técnica distinta.*no garantiza actualidad clínica/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Revisar|Crear tarea|Resolver tarea/ }),
  ).toHaveCount(0);

  const tableRegion = page.getByLabel("Fuentes operativas autorizadas");
  await tableRegion.focus();
  await expect(tableRegion).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(tableRegion).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Paginación del panel operativo" }),
  ).toBeVisible();
  const next = page.getByRole("button", { name: "Página siguiente" });
  if (await next.isEnabled()) {
    await next.focus();
    await expect(next).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").last()).toContainText(/Página 2 cargada/);
    await expect(page.getByRole("button", { name: "Página anterior" })).toBeEnabled();
  }

  const canonicalItems = await collectOperationalItems(page.request);
  const checkIn = canonicalItems.find(({ sourceType }) => sourceType === "CHECK_IN");
  const evidence = canonicalItems.find(({ sourceType }) => sourceType === "GOVERNANCE_EVIDENCE");
  expect(checkIn).toBeDefined();
  expect(evidence).toBeDefined();
  expect(checkIn!.sourceUpdatedAt).not.toBeNull();

  await page.goto(checkIn!.canonicalHref);
  await expect(page.getByRole("tab", { name: "Check-ins" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("heading", { name: "Actividad programada" })).toBeVisible();

  await page.goto(evidence!.canonicalHref);
  await expect(page.getByRole("tab", { name: "Evidencia / Trazabilidad" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("heading", { name: "Evidencia / Trazabilidad", exact: true }),
  ).toBeVisible();

  await page.goto(`/episodes/${encodeURIComponent(evidence!.episodeId)}?tab=not-allowlisted`);
  await expect(page.getByRole("tab", { name: "Resumen" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Resumen del episodio" })).toBeVisible();
});

test("panel anuncia estados vacío y error sin atribuir culpa", async ({ page }) => {
  let releaseResponse: () => void = () => undefined;
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route("**/api/demo/operational-continuity?**", async (route) => {
    await responseGate;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        notice: "SINTÉTICO / NO USO CLÍNICO",
        limitation: "Solo lectura",
        items: [],
        page: {
          size: 12,
          returned: 0,
          hasNextPage: false,
          truncated: false,
          nextCursor: null,
        },
        freshness: {
          state: "UPDATE_UNKNOWN",
          generatedAt: "2026-08-09T12:00:00.000Z",
          explanation: "Actualidad no garantizada.",
        },
      }),
    });
  });
  await login(page);
  try {
    await expect(page.getByText("Componiendo la vista administrativa del circuito…")).toBeVisible();
  } finally {
    releaseResponse();
  }
  await expect(
    page.getByText("No hay fuentes autorizadas para esta identidad profesional."),
  ).toBeVisible();

  await page.unroute("**/api/demo/operational-continuity?**");
  await page.getByRole("button", { name: "Cambiar usuario demo" }).click();
  await page.route("**/api/demo/operational-continuity?**", (route) =>
    route.fulfill({ status: 500, body: "{}" }),
  );
  await page.getByLabel("Usuario demo").selectOption("demo-nurse");
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  await expect(page.locator(".error-state")).toContainText(
    "No se pudo consultar la vista administrativa. No se ha realizado ninguna acción.",
  );
});
