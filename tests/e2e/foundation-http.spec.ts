import { createHash, randomBytes, randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { expect, request as apiRequest, test, type APIRequestContext } from "@playwright/test";

import { evaluateLegalRecordAuthorization } from "../../src/domain/legal/legal-authorization";
import type { LegalRecordType } from "../../src/domain/legal/legal-records";

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

async function createPersistedAuthenticatedContext(role: DemoRole): Promise<APIRequestContext> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { syntheticAlias: `demo-${role}` },
  });
  const rawToken = randomBytes(32).toString("base64url");
  await prisma.sessionMetadata.create({
    data: {
      userId: user.id,
      sessionTokenHash: createHash("sha256").update(rawToken).digest("hex"),
      authenticationMethod: "demo-local",
      correlationId: randomUUID(),
      userAgentHash: null,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });

  return apiRequest.newContext({
    baseURL,
    extraHTTPHeaders: {
      ...originHeaders,
      Cookie: `${sessionCookieName}=${rawToken}`,
    },
  });
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

  test("panel jurídico separa registros y mantiene políticas locales pendientes", async () => {
    const patientContext = await createAuthenticatedContext("patient");
    const state = await patientContext.get("/api/demo/legal-records?subject=demo-patient");
    expect(state.status()).toBe(200);
    const body = (await state.json()) as {
      notice: string;
      policies: {
        id: string;
        policyKey: string;
        recordType: LegalRecordType;
        scope: string;
        state: string;
      }[];
      records: {
        id: string;
        recordType: string;
        revoked: boolean;
        evidencePresent: boolean;
        effectiveAuthorization: {
          allowed: boolean;
          reason: string;
          code: string;
          label: string;
          recordId: string | null;
          policyVersionId: string | null;
        };
      }[];
    };
    expect(body.notice).toBe("SINTÉTICO / NO USO CLÍNICO");
    expect(body.policies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ scope: "pilot", state: "PENDING" }),
        expect.objectContaining({ scope: "care-treatment", state: "PENDING" }),
      ]),
    );

    const pilotPolicy = body.policies.find(({ policyKey }) => policyKey === "pilot-participation");
    if (!pilotPolicy) throw new Error("Expected synthetic pilot policy");
    const created = await patientContext.post("/api/demo/legal-records", {
      data: {
        action: "record",
        subjectAlias: "demo-patient",
        recordType: "PARTICIPATION",
        state: "ACTIVE",
        policyVersionId: pilotPolicy.id,
      },
    });
    expect(created.status()).toBe(201);
    const { recordId } = (await created.json()) as { recordId: string };

    const patient = await prisma.user.findUniqueOrThrow({
      where: { syntheticAlias: "demo-patient" },
    });
    const digitalPolicy = body.policies.find(
      ({ policyKey }) => policyKey === "digital-participation",
    );
    if (!digitalPolicy) throw new Error("Expected synthetic digital policy");
    const sharedId = `shared-${randomUUID()}`;
    await prisma.$transaction([
      prisma.participationRecord.create({
        data: {
          id: sharedId,
          subjectUserId: patient.id,
          state: "ACTIVE",
          scope: "pilot",
          policyVersionId: pilotPolicy.id,
          actorUserId: patient.id,
          origin: "DEMO_UI",
          evidenceType: "RECORDED_INTERACTION",
          evidenceRef: "SYNTHETIC-SHARED-PARTICIPATION",
        },
      }),
      prisma.digitalParticipationRecord.create({
        data: {
          id: sharedId,
          subjectUserId: patient.id,
          state: "ACTIVE",
          scope: "check-ins",
          policyVersionId: digitalPolicy.id,
          actorUserId: patient.id,
          origin: "DEMO_UI",
          evidenceType: "RECORDED_INTERACTION",
          evidenceRef: "SYNTHETIC-SHARED-DIGITAL",
        },
      }),
      prisma.revocationEvent.create({
        data: {
          targetType: "PARTICIPATION",
          targetRecordId: sharedId,
          subjectUserId: patient.id,
          scope: "pilot",
          policyVersionId: pilotPolicy.id,
          actorUserId: patient.id,
          origin: "DEMO_UI",
          evidenceType: "RECORDED_INTERACTION",
          evidenceRef: "SYNTHETIC-SHARED-REVOCATION",
        },
      }),
    ]);

    const refreshed = await patientContext.get("/api/demo/legal-records?subject=demo-patient");
    const refreshedBody = (await refreshed.json()) as typeof body;
    const activePendingPolicyRecord = refreshedBody.records.find(({ id }) => id === recordId);
    const [persistedRecord, persistedPolicy, persistedRevocations] = await Promise.all([
      prisma.participationRecord.findUniqueOrThrow({ where: { id: recordId } }),
      prisma.policyVersion.findUniqueOrThrow({ where: { id: pilotPolicy.id } }),
      prisma.revocationEvent.findMany({ where: { subjectUserId: patient.id } }),
    ]);
    const domainDecision = evaluateLegalRecordAuthorization(
      { ...persistedRecord, recordType: "PARTICIPATION" },
      { policies: [persistedPolicy], revocations: persistedRevocations, now: new Date() },
    );
    expect(activePendingPolicyRecord?.evidencePresent).toBe(true);
    expect(activePendingPolicyRecord?.effectiveAuthorization).toEqual(domainDecision);
    expect(domainDecision).toMatchObject({
      allowed: false,
      code: "POLICY_PENDING",
      label: "DENEGADO — política pendiente de validación local",
    });
    expect(JSON.stringify(refreshedBody)).not.toContain("evidenceRef");
    expect(
      refreshedBody.records.find(
        (record) => record.id === sharedId && record.recordType === "PARTICIPATION",
      )?.revoked,
    ).toBe(true);
    expect(
      refreshedBody.records.find(
        (record) => record.id === sharedId && record.recordType === "DIGITAL_PARTICIPATION",
      )?.revoked,
    ).toBe(false);
    await patientContext.dispose();

    const caregiverContext = await createAuthenticatedContext("caregiver");
    expect(
      (await caregiverContext.get("/api/demo/legal-records?subject=demo-patient")).status(),
    ).toBe(403);
    await caregiverContext.dispose();
  });

  test("aplica por HTTP la matriz de creación y minimiza la base jurídica", async () => {
    const patientContext = await createPersistedAuthenticatedContext("patient");
    const clinicianContext = await createPersistedAuthenticatedContext("clinician");
    const state = (await (
      await patientContext.get("/api/demo/legal-records?subject=demo-patient")
    ).json()) as {
      policies: { id: string; policyKey: string; recordType: LegalRecordType; scope: string }[];
    };
    const policyId = (policyKey: string) => {
      const policy = state.policies.find((candidate) => candidate.policyKey === policyKey);
      if (!policy) throw new Error(`Expected canonical policy ${policyKey}`);
      return policy.id;
    };
    const policyByType: Record<LegalRecordType, string> = {
      PARTICIPATION: policyId("pilot-participation"),
      DIGITAL_PARTICIPATION: policyId("digital-participation"),
      COMMUNICATION_PERMISSION: policyId("communication-permission-email-check-in"),
      CAREGIVER_AUTHORIZATION: policyId("caregiver-appointments"),
      PROCESSING_BASIS: policyId("processing-basis-care-treatment"),
    };
    const matrix = [
      ["patient", "PARTICIPATION", 201],
      ["patient", "DIGITAL_PARTICIPATION", 201],
      ["patient", "COMMUNICATION_PERMISSION", 201],
      ["patient", "CAREGIVER_AUTHORIZATION", 201],
      ["patient", "PROCESSING_BASIS", 403],
      ["clinician", "PARTICIPATION", 403],
      ["clinician", "DIGITAL_PARTICIPATION", 403],
      ["clinician", "COMMUNICATION_PERMISSION", 403],
      ["clinician", "CAREGIVER_AUTHORIZATION", 403],
      ["clinician", "PROCESSING_BASIS", 201],
    ] as const satisfies readonly (readonly ["patient" | "clinician", LegalRecordType, number])[];
    let processingBasisRecordId: string | null = null;

    for (const [role, recordType, expectedStatus] of matrix) {
      const context = role === "patient" ? patientContext : clinicianContext;
      const response = await context.post("/api/demo/legal-records", {
        data: {
          action: "record",
          subjectAlias: "demo-patient",
          recordType,
          state: "PENDING",
          policyVersionId: policyByType[recordType],
          ...(recordType === "COMMUNICATION_PERMISSION"
            ? { channel: "EMAIL", purpose: "check-in" }
            : {}),
          ...(recordType === "CAREGIVER_AUTHORIZATION"
            ? { caregiverAlias: "demo-caregiver", scope: "caregiver:appointments" }
            : {}),
          ...(recordType === "PROCESSING_BASIS"
            ? { scope: "care-treatment", basisCode: "PENDING_INSTITUTIONAL_DECISION" }
            : {}),
        },
      });
      expect(response.status(), `${role} / ${recordType}`).toBe(expectedStatus);
      if (role === "clinician" && recordType === "PROCESSING_BASIS") {
        processingBasisRecordId = ((await response.json()) as { recordId: string }).recordId;
      }
    }

    const panelResponse = await clinicianContext.get(
      "/api/demo/legal-records?subject=demo-patient",
    );
    const panelJson = (await panelResponse.json()) as {
      records: {
        id: string;
        basisConfigured?: boolean;
        label?: string;
      }[];
    };
    expect(JSON.stringify(panelJson)).not.toContain("basisCode");
    expect(JSON.stringify(panelJson)).not.toContain("PENDING_INSTITUTIONAL_DECISION");
    expect(panelJson.records.find(({ id }) => id === processingBasisRecordId)).toMatchObject({
      basisConfigured: true,
      label: "Base institucional registrada",
    });
    await patientContext.dispose();
    await clinicianContext.dispose();
  });

  test("rechaza sujetos no patient y cuidadores sin identidad caregiver válida", async () => {
    const patientContext = await createPersistedAuthenticatedContext("patient");
    const state = (await (
      await patientContext.get("/api/demo/legal-records?subject=demo-patient")
    ).json()) as { policies: { id: string; policyKey: string; scope: string }[] };
    const pilotPolicy = state.policies.find(({ policyKey }) => policyKey === "pilot-participation");
    const caregiverPolicy = state.policies.find(
      ({ policyKey }) => policyKey === "caregiver-appointments",
    );
    if (!pilotPolicy || !caregiverPolicy) throw new Error("Expected synthetic legal policies");

    const [noRole, inactivePatient, nonSynthetic, inactiveCaregiver, nonSyntheticCaregiver] =
      await Promise.all([
        prisma.user.create({
          data: {
            syntheticAlias: `leg-nr-${randomUUID()}`,
            displayLabel: "SINTÉTICO / NO USO CLÍNICO — sin rol patient",
            isSynthetic: true,
          },
        }),
        prisma.user.create({
          data: {
            syntheticAlias: `leg-ip-${randomUUID()}`,
            displayLabel: "SINTÉTICO / NO USO CLÍNICO — patient inactivo",
            isSynthetic: true,
            isActive: false,
            roleAssignments: { create: { role: "patient" } },
          },
        }),
        prisma.user.create({
          data: {
            syntheticAlias: `leg-ns-${randomUUID()}`,
            displayLabel: "SINTÉTICO / NO USO CLÍNICO — fixture no sintética",
            isSynthetic: false,
            roleAssignments: { create: { role: "patient" } },
          },
        }),
        prisma.user.create({
          data: {
            syntheticAlias: `leg-ic-${randomUUID()}`,
            displayLabel: "SINTÉTICO / NO USO CLÍNICO — caregiver inactivo",
            isSynthetic: true,
            isActive: false,
            roleAssignments: { create: { role: "caregiver" } },
          },
        }),
        prisma.user.create({
          data: {
            syntheticAlias: `leg-nc-${randomUUID()}`,
            displayLabel: "SINTÉTICO / NO USO CLÍNICO — caregiver no sintético",
            isSynthetic: false,
            roleAssignments: { create: { role: "caregiver" } },
          },
        }),
      ]);

    for (const subjectAlias of [
      "demo-support",
      "demo-admin",
      "demo-caregiver",
      noRole.syntheticAlias,
      inactivePatient.syntheticAlias,
      nonSynthetic.syntheticAlias,
    ]) {
      expect(
        (
          await patientContext.post("/api/demo/legal-records", {
            data: {
              action: "record",
              subjectAlias,
              recordType: "PARTICIPATION",
              state: "PENDING",
              policyVersionId: pilotPolicy.id,
            },
          })
        ).status(),
        subjectAlias,
      ).toBe(403);
    }

    for (const caregiverAlias of [
      "demo-patient",
      "demo-support",
      "demo-admin",
      "demo-clinician",
      inactiveCaregiver.syntheticAlias,
      nonSyntheticCaregiver.syntheticAlias,
      noRole.syntheticAlias,
    ]) {
      expect(
        (
          await patientContext.post("/api/demo/legal-records", {
            data: {
              action: "record",
              subjectAlias: "demo-patient",
              recordType: "CAREGIVER_AUTHORIZATION",
              state: "ACTIVE",
              policyVersionId: caregiverPolicy.id,
              caregiverAlias,
              scope: "caregiver:appointments",
            },
          })
        ).status(),
        caregiverAlias,
      ).toBe(403);
    }
    await patientContext.dispose();
  });

  test("dos revocaciones HTTP concurrentes producen 201, 409 y un único evento", async () => {
    const patientContext = await createPersistedAuthenticatedContext("patient");
    const state = (await (
      await patientContext.get("/api/demo/legal-records?subject=demo-patient")
    ).json()) as { policies: { id: string; policyKey: string; scope: string }[] };
    const caregiverPolicy = state.policies.find(
      ({ policyKey }) => policyKey === "caregiver-appointments",
    );
    if (!caregiverPolicy) throw new Error("Expected synthetic caregiver policy");
    const created = await patientContext.post("/api/demo/legal-records", {
      data: {
        action: "record",
        subjectAlias: "demo-patient",
        recordType: "CAREGIVER_AUTHORIZATION",
        state: "ACTIVE",
        policyVersionId: caregiverPolicy.id,
        caregiverAlias: "demo-caregiver",
        scope: "caregiver:appointments",
      },
    });
    const { recordId } = (await created.json()) as { recordId: string };

    const responses = await Promise.all([
      patientContext.post("/api/demo/legal-records", {
        data: {
          action: "revoke",
          targetType: "CAREGIVER_AUTHORIZATION",
          targetRecordId: recordId,
        },
      }),
      patientContext.post("/api/demo/legal-records", {
        data: {
          action: "revoke",
          targetType: "CAREGIVER_AUTHORIZATION",
          targetRecordId: recordId,
        },
      }),
    ]);
    expect(responses.map((response) => response.status()).sort()).toEqual([201, 409]);
    const revocations = await prisma.revocationEvent.findMany({
      where: { targetType: "CAREGIVER_AUTHORIZATION", targetRecordId: recordId },
    });
    expect(revocations).toHaveLength(1);
    const revocation = revocations[0];
    if (!revocation) throw new Error("Expected one synthetic revocation");
    await expect(
      prisma.auditEvent.count({
        where: { action: "LEGAL_RECORD_REVOKED", resourceId: revocation.id },
      }),
    ).resolves.toBe(1);
    await patientContext.dispose();
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
    expect((await foreignHost.get("/api/demo/rules")).status()).toBe(403);
    expect((await foreignHost.get("/api/demo/alerts")).status()).toBe(403);
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
    expect((await foreignForwardedHost.get("/api/demo/rules")).status()).toBe(403);
    expect((await foreignForwardedHost.get("/api/demo/alerts")).status()).toBe(403);
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
