import { createHash, randomBytes, randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { expect, request as apiRequest, test, type APIRequestContext } from "@playwright/test";

const prisma = new PrismaClient();
const baseURL = "http://127.0.0.1:3000";
const originHeaders = { Origin: baseURL };
const sessionCookieName = "guardian_demo_session";

const resources = [
  "authenticated-session",
  "role-administration",
  "simulated-clinical-record",
  "simulated-own-record",
  "simulated-caregiver-section",
  "technical-support-metadata",
] as const;

const allowedByRole = {
  admin: ["authenticated-session", "role-administration", "technical-support-metadata"],
  nurse: ["authenticated-session", "simulated-clinical-record"],
  clinician: ["authenticated-session", "simulated-clinical-record"],
  patient: ["authenticated-session", "simulated-own-record"],
  caregiver: ["authenticated-session", "simulated-caregiver-section"],
  support: ["authenticated-session", "technical-support-metadata"],
} as const;

type DemoRole = keyof typeof allowedByRole;

async function createAuthenticatedContext(role: DemoRole): Promise<APIRequestContext> {
  const context = await apiRequest.newContext({ baseURL, extraHTTPHeaders: originHeaders });
  const response = await context.post("/api/demo/session", {
    data: { syntheticAlias: `demo-${role}` },
  });
  expect(response.status()).toBe(201);
  return context;
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test.describe.serial("HTTP demo authentication and authorization with PostgreSQL", () => {
  test("login demo crea cookie segura para loopback y sesión/auditoría persistidas", async () => {
    const context = await createAuthenticatedContext("nurse");
    const state = await context.storageState();
    const cookie = state.cookies.find(({ name }) => name === sessionCookieName);

    expect(cookie).toMatchObject({
      httpOnly: true,
      sameSite: "Strict",
      secure: false,
    });
    expect(cookie?.expires).toBeGreaterThan(Date.now() / 1000 + 7 * 60 * 60);

    const tokenHash = createHash("sha256")
      .update(cookie?.value ?? "")
      .digest("hex");
    const session = await prisma.sessionMetadata.findUnique({
      where: { sessionTokenHash: tokenHash },
    });
    expect(session).toMatchObject({ authenticationMethod: "demo-local", revokedAt: null });
    if (!session) throw new Error("Expected synthetic demo session");
    await expect(
      prisma.auditEvent.findFirst({
        where: { action: "DEMO_LOGIN", resourceId: session.id, outcome: "SUCCESS" },
      }),
    ).resolves.not.toBeNull();

    const authenticated = await context.get("/api/demo/resources/authenticated-session");
    expect(authenticated.status()).toBe(200);
    await context.dispose();
  });

  test("los seis roles recorren por HTTP todos los recursos permitidos y prohibidos", async () => {
    for (const role of Object.keys(allowedByRole) as DemoRole[]) {
      const context = await createAuthenticatedContext(role);
      for (const resource of resources) {
        const response = await context.get(`/api/demo/resources/${resource}`);
        const expectedStatus = allowedByRole[role].some((allowed) => allowed === resource)
          ? 200
          : 403;
        expect(response.status(), `${role} -> ${resource}`).toBe(expectedStatus);
      }
      await context.dispose();
    }
  });

  test("support recibe 403 clínico y admin no hereda acceso clínico", async () => {
    for (const role of ["support", "admin"] as const) {
      const context = await createAuthenticatedContext(role);
      const response = await context.get("/api/demo/resources/simulated-clinical-record");
      expect(response.status()).toBe(403);
      await context.dispose();
    }
  });

  test("usuario sin rol, cookie ausente y cookie inválida producen 401", async ({ request }) => {
    expect((await request.get("/api/demo/resources/authenticated-session")).status()).toBe(401);

    const invalidCookieContext = await apiRequest.newContext({
      baseURL,
      extraHTTPHeaders: { Cookie: `${sessionCookieName}=invalid-synthetic-token` },
    });
    expect(
      (await invalidCookieContext.get("/api/demo/resources/authenticated-session")).status(),
    ).toBe(401);
    await invalidCookieContext.dispose();

    const noRoleUser = await prisma.user.create({
      data: {
        syntheticAlias: `e2e-no-role-${randomUUID()}`,
        displayLabel: "SINTÉTICO / NO USO CLÍNICO — sin rol",
        isSynthetic: true,
      },
    });
    const rawToken = randomBytes(32).toString("base64url");
    await prisma.sessionMetadata.create({
      data: {
        userId: noRoleUser.id,
        sessionTokenHash: createHash("sha256").update(rawToken).digest("hex"),
        authenticationMethod: "demo-local",
        correlationId: randomUUID(),
        userAgentHash: null,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const noRoleContext = await apiRequest.newContext({
      baseURL,
      extraHTTPHeaders: { Cookie: `${sessionCookieName}=${rawToken}` },
    });
    expect((await noRoleContext.get("/api/demo/resources/authenticated-session")).status()).toBe(
      401,
    );
    await noRoleContext.dispose();
  });

  test("una sesión revocada deja de funcionar aunque se reutilice su cookie", async () => {
    const context = await createAuthenticatedContext("patient");
    const state = await context.storageState();
    const rawToken = state.cookies.find(({ name }) => name === sessionCookieName)?.value;
    expect(rawToken).toBeTruthy();
    expect((await context.delete("/api/demo/session")).status()).toBe(200);

    const staleContext = await apiRequest.newContext({
      baseURL,
      extraHTTPHeaders: { Cookie: `${sessionCookieName}=${rawToken}` },
    });
    expect((await staleContext.get("/api/demo/resources/authenticated-session")).status()).toBe(
      401,
    );
    await staleContext.dispose();
    await context.dispose();
  });

  test("Origin extranjero o ausente bloquea mutaciones", async () => {
    const missingOrigin = await apiRequest.newContext({ baseURL });
    expect(
      (
        await missingOrigin.post("/api/demo/session", {
          data: { syntheticAlias: "demo-nurse" },
        })
      ).status(),
    ).toBe(403);
    await missingOrigin.dispose();

    const foreignOrigin = await apiRequest.newContext({
      baseURL,
      extraHTTPHeaders: { Origin: "https://attacker.invalid" },
    });
    expect(
      (
        await foreignOrigin.post("/api/demo/session", {
          data: { syntheticAlias: "demo-nurse" },
        })
      ).status(),
    ).toBe(403);
    await foreignOrigin.dispose();
  });

  test("Host o X-Forwarded-Host no loopback bloquea las rutas demo", async () => {
    const foreignHost = await apiRequest.newContext({
      baseURL,
      extraHTTPHeaders: { ...originHeaders, Host: "192.168.1.50:3000" },
    });
    expect(
      (
        await foreignHost.post("/api/demo/session", {
          data: { syntheticAlias: "demo-nurse" },
        })
      ).status(),
    ).toBe(403);
    expect((await foreignHost.get("/api/demo/resources/authenticated-session")).status()).toBe(403);
    await foreignHost.dispose();

    const foreignForwardedHost = await apiRequest.newContext({
      baseURL,
      extraHTTPHeaders: { ...originHeaders, "X-Forwarded-Host": "guardian-staging.invalid" },
    });
    expect(
      (
        await foreignForwardedHost.post("/api/demo/session", {
          data: { syntheticAlias: "demo-nurse" },
        })
      ).status(),
    ).toBe(403);
    await foreignForwardedHost.dispose();
  });

  test("asignación administrativa autorizada, duplicada y no autorizada", async () => {
    const target = await prisma.user.create({
      data: {
        syntheticAlias: `e2e-admin-target-${randomUUID()}`,
        displayLabel: "SINTÉTICO / NO USO CLÍNICO — objetivo admin",
        isSynthetic: true,
      },
    });
    const adminContext = await createAuthenticatedContext("admin");
    const assignmentResponses = await Promise.all([
      adminContext.post("/api/admin/role-assignments", {
        data: { targetUserId: target.id, role: "support" },
      }),
      adminContext.post("/api/admin/role-assignments", {
        data: { targetUserId: target.id, role: "support" },
      }),
    ]);
    expect(assignmentResponses.map((response) => response.status()).sort()).toEqual([201, 409]);
    const assigned = assignmentResponses.find((response) => response.status() === 201);
    if (!assigned) throw new Error("Expected one successful synthetic role assignment");
    const { roleAssignmentId } = (await assigned.json()) as { roleAssignmentId: string };
    await expect(
      prisma.auditEvent.findFirst({
        where: { action: "ROLE_ASSIGNED", resourceId: roleAssignmentId, actorRole: "admin" },
      }),
    ).resolves.not.toBeNull();
    await adminContext.dispose();

    const unauthorizedTarget = await prisma.user.create({
      data: {
        syntheticAlias: `e2e-nurse-target-${randomUUID()}`,
        displayLabel: "SINTÉTICO / NO USO CLÍNICO — objetivo denegado",
        isSynthetic: true,
      },
    });
    const nurseContext = await createAuthenticatedContext("nurse");
    expect(
      (
        await nurseContext.post("/api/admin/role-assignments", {
          data: { targetUserId: unauthorizedTarget.id, role: "support" },
        })
      ).status(),
    ).toBe(403);
    await expect(
      prisma.roleAssignment.findFirst({ where: { userId: unauthorizedTarget.id } }),
    ).resolves.toBeNull();
    await nurseContext.dispose();
  });

  test("la API limita targets a usuarios sintéticos activos no reservados", async () => {
    const [fixedSupport, inactiveSynthetic, nonSynthetic] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { syntheticAlias: "demo-support" } }),
      prisma.user.create({
        data: {
          syntheticAlias: `e2e-inactive-target-${randomUUID()}`,
          displayLabel: "SINTÉTICO / NO USO CLÍNICO — inactivo",
          isSynthetic: true,
          isActive: false,
        },
      }),
      prisma.user.create({
        data: {
          syntheticAlias: `e2e-non-synthetic-target-${randomUUID()}`,
          displayLabel: "SINTÉTICO / NO USO CLÍNICO — fixture marcada no sintética",
          isSynthetic: false,
        },
      }),
    ]);
    const adminContext = await createAuthenticatedContext("admin");
    const deniedTargets = [fixedSupport.id, inactiveSynthetic.id, nonSynthetic.id, randomUUID()];

    for (const targetUserId of deniedTargets) {
      const response = await adminContext.post("/api/admin/role-assignments", {
        data: { targetUserId, role: "nurse" },
      });
      expect(response.status()).toBe(403);
      await expect(response.json()).resolves.toMatchObject({ error: { code: "FORBIDDEN" } });
    }
    await adminContext.dispose();

    await expect(
      prisma.roleAssignment.findFirst({
        where: { userId: fixedSupport.id, role: "nurse", revokedAt: null },
      }),
    ).resolves.toBeNull();

    const supportContext = await createAuthenticatedContext("support");
    expect(
      (await supportContext.get("/api/demo/resources/simulated-clinical-record")).status(),
    ).toBe(403);
    await supportContext.dispose();
  });
});
