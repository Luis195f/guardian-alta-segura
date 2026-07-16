import { describe, expect, it } from "vitest";

import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { InMemoryRateLimiter } from "@/infrastructure/http/rate-limiter";
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

  it("limita intentos dentro de una ventana", () => {
    const limiter = new InMemoryRateLimiter(2, 1_000);
    expect(limiter.take("synthetic-key", 1_000)).toBe(true);
    expect(limiter.take("synthetic-key", 1_001)).toBe(true);
    expect(limiter.take("synthetic-key", 1_002)).toBe(false);
    expect(limiter.take("synthetic-key", 2_001)).toBe(true);
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
