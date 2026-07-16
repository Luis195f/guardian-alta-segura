import { describe, expect, it } from "vitest";

import { readServerEnvironment } from "@/infrastructure/config/env";

const baseEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://synthetic:synthetic@localhost:5432/synthetic",
  APP_BASE_URL: "http://localhost:3000",
  DEMO_MODE: "true",
  DEMO_SESSION_TTL_HOURS: "8",
  SESSION_COOKIE_SECURE: "false",
};

describe("server environment validation", () => {
  it("acepta configuración demo local explícita", () => {
    expect(readServerEnvironment(baseEnvironment)).toMatchObject({
      nodeEnv: "test",
      demoMode: true,
      demoSessionTtlHours: 8,
      sessionCookieSecure: false,
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

  it.each(["0", "13", "8.5", "not-a-number"])(
    "rechaza TTL demo fuera del rango seguro: %s",
    (ttl) => {
      expect(() =>
        readServerEnvironment({ ...baseEnvironment, DEMO_SESSION_TTL_HOURS: ttl }),
      ).toThrow("DEMO_SESSION_TTL_HOURS must be an integer between 1 and 12");
    },
  );
});
