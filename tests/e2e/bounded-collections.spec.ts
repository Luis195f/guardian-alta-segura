import { expect, request as apiRequest, test, type APIRequestContext } from "@playwright/test";

const baseURL = "http://127.0.0.1:3000";

async function authenticated(alias: string): Promise<APIRequestContext> {
  const context = await apiRequest.newContext({
    baseURL,
    extraHTTPHeaders: { Origin: baseURL },
  });
  const response = await context.post("/api/demo/session", {
    data: { syntheticAlias: alias },
  });
  expect(response.status()).toBe(201);
  return context;
}

async function expectBounded(
  context: APIRequestContext,
  url: string,
  collectionKey: string,
  coverageKey: string = collectionKey,
) {
  const response = await context.get(url);
  expect(response.status(), url).toBe(200);
  const payload = (await response.json()) as Record<string, unknown>;
  expect(payload.collectionLimitNotice).toContain("Límite técnico");
  expect(payload.collectionLimitNotice).toContain("no es una regla ni un umbral clínico");
  const values = payload[collectionKey] as unknown[];
  const coverage = (payload.collectionCoverage as Record<string, Record<string, unknown>>)[
    coverageKey
  ]!;
  expect(values.length).toBeLessThanOrEqual(50);
  expect(coverage).toMatchObject({
    returned: values.length,
    limit: 50,
    basis: "TECHNICAL_DEMO_LIMIT",
  });
  expect(typeof coverage.truncated).toBe("boolean");
  return payload;
}

test("las colecciones HTTP principales declaran un límite técnico honesto", async () => {
  const nurse = await authenticated("demo-nurse");
  const patient = await authenticated("demo-patient");
  try {
    const episodes = await expectBounded(nurse, "/api/demo/discharge-episodes", "episodes");
    await expectBounded(nurse, "/api/demo/check-in-protocols", "protocols");
    await expectBounded(nurse, "/api/demo/check-ins", "assignments");
    await expectBounded(nurse, "/api/demo/alerts", "alerts");
    await expectBounded(nurse, "/api/demo/rules", "rules");
    await expectBounded(nurse, "/api/demo/nursing-workqueue", "entries");
    await expectBounded(patient, "/api/demo/legal-records?subject=demo-patient", "records");
    await expectBounded(patient, "/api/demo/caregiver-access", "authorizations");
    await expectBounded(patient, "/api/demo/safety-plans", "plans");

    const episodeId = (episodes.episodes as { readonly id: string }[])[0]?.id;
    expect(episodeId).toBeTruthy();
    await expectBounded(nurse, `/api/demo/discharge-episodes/${episodeId}/home-safety`, "versions");
  } finally {
    await nurse.dispose();
    await patient.dispose();
  }
});
