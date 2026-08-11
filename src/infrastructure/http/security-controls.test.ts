import nextConfig from "../../../next.config";

import { describe, expect, it } from "vitest";

import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { DemoLoginRateLimiter, InMemoryRateLimiter } from "@/infrastructure/http/rate-limiter";
import { sessionCookie } from "@/infrastructure/http/session-cookie";
import { assertLoopbackRequestHost } from "@/infrastructure/security/loopback";

describe("HTTP security controls", () => {
  it.each(["127.0.0.1:3000", "localhost:3000", "[::1]:3000"])(
    "acepta un Host loopback: %s",
    (host) => {
      const request = new Request("http://127.0.0.1:3000/api/demo/session", {
        headers: { Host: host },
      });
      expect(() => assertLoopbackRequestHost(request)).not.toThrow();
    },
  );

  it.each([undefined, "192.168.1.50:3000", "guardian-staging.invalid"])(
    "rechaza Host ausente o no loopback: %s",
    (host) => {
      const headers = new Headers();
      if (host) headers.set("Host", host);
      const request = new Request("http://127.0.0.1:3000/api/demo/session", { headers });
      expect(() => assertLoopbackRequestHost(request)).toThrow("FORBIDDEN");
    },
  );

  it("rechaza un X-Forwarded-Host no loopback aunque Host sea loopback", () => {
    const request = new Request("http://127.0.0.1:3000/api/demo/session", {
      headers: { Host: "127.0.0.1:3000", "X-Forwarded-Host": "192.168.1.50:3000" },
    });
    expect(() => assertLoopbackRequestHost(request)).toThrow("FORBIDDEN");
  });

  it("acepta X-Forwarded-Host solo si coincide con el Host loopback validado", () => {
    const request = new Request("http://127.0.0.1:3000/api/demo/session", {
      headers: { Host: "127.0.0.1:3000", "X-Forwarded-Host": "127.0.0.1:3000" },
    });
    expect(() => assertLoopbackRequestHost(request)).not.toThrow();
  });

  it.each(["localhost:3000", "127.0.0.1:3000, 127.0.0.1:3000", ""])(
    "rechaza X-Forwarded-Host contradictorio, múltiple o vacío: %s",
    (forwardedHost) => {
      const request = new Request("http://127.0.0.1:3000/api/demo/session", {
        headers: { Host: "127.0.0.1:3000", "X-Forwarded-Host": forwardedHost },
      });
      expect(() => assertLoopbackRequestHost(request)).toThrow("FORBIDDEN");
    },
  );

  it("exige Origin exacto en mutaciones", () => {
    const valid = new Request("http://localhost:3000/api/demo/session", {
      method: "POST",
      headers: { Origin: "http://localhost:3000" },
    });
    expect(() => assertSameOrigin(valid, "http://localhost:3000")).not.toThrow();

    const foreign = new Request("http://localhost:3000/api/demo/session", {
      method: "POST",
      headers: { Origin: "https://attacker.invalid" },
    });
    expect(() => assertSameOrigin(foreign, "http://localhost:3000")).toThrow();

    const malformed = new Request("http://localhost:3000/api/demo/session", {
      method: "POST",
      headers: { Origin: "not a valid origin" },
    });
    expect(() => assertSameOrigin(malformed, "http://localhost:3000")).toThrow();
  });

  it.each([
    "http://localhost:3000/path",
    "http://localhost:3000?ambiguous=true",
    "http://user@localhost:3000",
    "http://localhost:3000/",
    "null",
    "http://localhost:3000,https://attacker.invalid",
  ])("rechaza Origin no canónico o ambiguo: %s", (origin) => {
    const request = new Request("http://localhost:3000/api/demo/session", {
      method: "POST",
      headers: { Origin: origin },
    });
    expect(() => assertSameOrigin(request, "http://localhost:3000")).toThrow("FORBIDDEN");
  });

  it("limita intentos dentro de una ventana", () => {
    const limiter = new InMemoryRateLimiter(2, 1_000);
    expect(limiter.take("synthetic-key", 1_000)).toBe(true);
    expect(limiter.take("synthetic-key", 1_001)).toBe(true);
    expect(limiter.take("synthetic-key", 1_002)).toBe(false);
    expect(limiter.take("synthetic-key", 2_001)).toBe(true);
  });

  it("particiona el contrato puro de login únicamente por alias sintético", () => {
    const limiter = new DemoLoginRateLimiter(2, 1_000);
    expect(limiter.takeForSyntheticAlias("demo-admin", 1_000)).toBe(true);
    expect(limiter.takeForSyntheticAlias("demo-admin", 1_001)).toBe(true);
    expect(limiter.takeForSyntheticAlias("demo-admin", 1_002)).toBe(false);
    expect(limiter.takeForSyntheticAlias("demo-nurse", 1_002)).toBe(true);
  });

  it("publica una CSP restrictiva sin simular nonces ni permitir inline", async () => {
    const rules = await nextConfig.headers?.();
    const headers = new Map(rules?.[0]?.headers.map((header) => [header.key, header.value]));
    const policy = headers.get("Content-Security-Policy");
    expect(policy).toBe("base-uri 'none'; object-src 'none'; frame-ancestors 'none'");
    expect(policy).not.toMatch(/unsafe-inline|data:|\*/u);
  });

  it("configura la sesión como HttpOnly, SameSite strict y Secure cuando corresponde", () => {
    const cookie = sessionCookie("raw-token", new Date("2026-07-16T00:00:00.000Z"), true);
    expect(cookie).toMatchObject({
      httpOnly: true,
      sameSite: "strict",
      secure: true,
      path: "/",
    });
  });
});
