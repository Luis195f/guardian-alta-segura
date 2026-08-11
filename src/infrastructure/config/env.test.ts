import { describe, expect, it } from "vitest";

import { readServerEnvironment } from "@/infrastructure/config/env";

const baseEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://synthetic:synthetic@localhost:5432/synthetic",
  APP_BASE_URL: "http://localhost:3000",
  DEMO_MODE: "true",
  DEMO_SESSION_TTL_HOURS: "8",
  CAREGIVER_DEMO_INVITATION_TTL_MINUTES: "30",
  CAREGIVER_DEMO_SESSION_TTL_HOURS: "8",
  SESSION_COOKIE_SECURE: "false",
  EXPLAINABLE_TRAFFIC_LIGHT: "false",
  COMMITMENT_ENGINE_ENABLED: "false",
};

describe("server environment validation", () => {
  it("acepta configuración demo local explícita", () => {
    expect(readServerEnvironment(baseEnvironment)).toMatchObject({
      nodeEnv: "test",
      demoMode: true,
      demoSessionTtlHours: 8,
      caregiverDemoInvitationTtlMinutes: 30,
      caregiverDemoSessionTtlHours: 8,
      sessionCookieSecure: false,
      explainableTrafficLight: false,
      commitmentEngineConfigured: true,
      commitmentEngineEnabled: false,
    });
  });

  it("rechaza NODE_ENV fuera de la unión tipada", () => {
    const invalidEnvironment = { ...baseEnvironment };
    Reflect.set(invalidEnvironment, "NODE_ENV", "preview");
    expect(() => readServerEnvironment(invalidEnvironment)).toThrow("NODE_ENV is invalid");
  });

  it.each(["http://localhost:3000", "http://127.0.0.1:3000", "http://[::1]:3000"])(
    "acepta demo únicamente en loopback: %s",
    (appBaseUrl) => {
      expect(readServerEnvironment({ ...baseEnvironment, APP_BASE_URL: appBaseUrl }).demoMode).toBe(
        true,
      );
    },
  );

  it.each([
    "http://192.168.1.50:3000",
    "https://guardian-staging.invalid",
    "https://guardian.example",
  ])("rechaza demo fuera de loopback: %s", (appBaseUrl) => {
    expect(() => readServerEnvironment({ ...baseEnvironment, APP_BASE_URL: appBaseUrl })).toThrow(
      "DEMO_MODE requires APP_BASE_URL on a loopback host",
    );
  });

  it("rechaza modo demo en producción", () => {
    expect(() =>
      readServerEnvironment({
        ...baseEnvironment,
        NODE_ENV: "production",
        APP_BASE_URL: "https://guardian.invalid",
        DEMO_MODE: "true",
        SESSION_COOKIE_SECURE: "true",
      }),
    ).toThrow("DEMO_MODE cannot be enabled in production");
  });

  it("rechaza cookies no seguras y HTTP en producción", () => {
    expect(() =>
      readServerEnvironment({
        ...baseEnvironment,
        NODE_ENV: "production",
        DEMO_MODE: "false",
      }),
    ).toThrow("APP_BASE_URL must use HTTPS in production");
  });

  it("no acepta bases distintas de PostgreSQL", () => {
    expect(() =>
      readServerEnvironment({ ...baseEnvironment, DATABASE_URL: "file:./synthetic.db" }),
    ).toThrow("DATABASE_URL must use PostgreSQL");
  });

  it("mantiene el semáforo de avisos explicables apagado por defecto", () => {
    const withoutTrafficLight = { ...baseEnvironment };
    delete withoutTrafficLight.EXPLAINABLE_TRAFFIC_LIGHT;
    expect(readServerEnvironment(withoutTrafficLight).explainableTrafficLight).toBe(false);
  });

  it("rechaza valores ambiguos para el feature flag del semáforo", () => {
    expect(() =>
      readServerEnvironment({ ...baseEnvironment, EXPLAINABLE_TRAFFIC_LIGHT: "1" }),
    ).toThrow('EXPLAINABLE_TRAFFIC_LIGHT must be exactly "true" or "false"');
  });

  it("mantiene el núcleo 5B apagado y marca el gate como ausente por defecto", () => {
    const withoutCommitmentGate = { ...baseEnvironment };
    delete withoutCommitmentGate.COMMITMENT_ENGINE_ENABLED;
    expect(readServerEnvironment(withoutCommitmentGate)).toMatchObject({
      commitmentEngineConfigured: false,
      commitmentEngineEnabled: false,
    });
  });

  it("rechaza valores ambiguos para el gate 5B", () => {
    expect(() =>
      readServerEnvironment({ ...baseEnvironment, COMMITMENT_ENGINE_ENABLED: "enabled" }),
    ).toThrow('COMMITMENT_ENGINE_ENABLED must be exactly "true" or "false"');
  });

  it("solo habilita el gate 5B junto al modo sintético local explícito", () => {
    expect(
      readServerEnvironment({ ...baseEnvironment, COMMITMENT_ENGINE_ENABLED: "true" }),
    ).toMatchObject({ commitmentEngineConfigured: true, commitmentEngineEnabled: true });
    expect(() =>
      readServerEnvironment({
        ...baseEnvironment,
        DEMO_MODE: "false",
        COMMITMENT_ENGINE_ENABLED: "true",
      }),
    ).toThrow("COMMITMENT_ENGINE_ENABLED requires explicit synthetic DEMO_MODE");
  });

  it("impide habilitar el gate 5B fuera de pruebas internas", () => {
    expect(() =>
      readServerEnvironment({
        ...baseEnvironment,
        NODE_ENV: "development",
        COMMITMENT_ENGINE_ENABLED: "true",
      }),
    ).toThrow("COMMITMENT_ENGINE_ENABLED is restricted to internal synthetic tests");
  });

  it.each(["0", "13", "8.5", "not-a-number"])(
    "rechaza TTL demo fuera del rango seguro: %s",
    (ttl) => {
      expect(() =>
        readServerEnvironment({ ...baseEnvironment, DEMO_SESSION_TTL_HOURS: ttl }),
      ).toThrow("DEMO_SESSION_TTL_HOURS must be an integer between 1 and 12");
    },
  );

  it.each(["4", "121", "30.5", "not-a-number"])(
    "rechaza TTL de invitación de cuidador fuera del supuesto demo: %s",
    (ttl) => {
      expect(() =>
        readServerEnvironment({
          ...baseEnvironment,
          CAREGIVER_DEMO_INVITATION_TTL_MINUTES: ttl,
        }),
      ).toThrow("CAREGIVER_DEMO_INVITATION_TTL_MINUTES must be an integer between 5 and 120");
    },
  );
});
