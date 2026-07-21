import { describe, expect, it } from "vitest";

import {
  LegalRecordDeniedError,
  LegalRecordInvalidError,
  RecordLegalDecisionService,
} from "@/application/legal/record-legal-decision";
import type {
  LegalRecordCreateInput,
  LegalRecordsTransaction,
  LegalRecordsUnitOfWork,
} from "@/application/ports/legal-records-unit-of-work";
import type { NewAuditEvent } from "@/domain/audit/audit-event";
import type { LegalRecordType } from "@/domain/legal/legal-records";

interface MemoryUser {
  readonly id: string;
  readonly isActive: boolean;
  readonly isSynthetic: boolean;
}

class MemoryLegalUnitOfWork implements LegalRecordsUnitOfWork, LegalRecordsTransaction {
  readonly records: LegalRecordCreateInput[] = [];
  readonly revocations: Parameters<LegalRecordsTransaction["createRevocation"]>[0][] = [];
  readonly auditEvents: NewAuditEvent[] = [];
  readonly caregiverAccessAudits: Parameters<
    LegalRecordsTransaction["appendCaregiverAccessAudit"]
  >[0][] = [];
  revokedCaregiverSessionCount = 0;
  readonly episodes = ["synthetic-episode-1"];
  readonly plans = ["synthetic-plan-v1"];
  readonly observations = ["synthetic-observation-1"];
  readonly users = new Map<string, MemoryUser>([
    ["demo-patient", { id: "patient-1", isActive: true, isSynthetic: true }],
    ["demo-caregiver", { id: "caregiver-1", isActive: true, isSynthetic: true }],
    ["demo-support", { id: "support-1", isActive: true, isSynthetic: true }],
    ["demo-admin", { id: "admin-1", isActive: true, isSynthetic: true }],
    ["demo-clinician", { id: "clinician-1", isActive: true, isSynthetic: true }],
    ["synthetic-no-role", { id: "no-role-1", isActive: true, isSynthetic: true }],
    ["inactive-caregiver", { id: "inactive-caregiver-1", isActive: false, isSynthetic: true }],
    ["external-caregiver", { id: "external-caregiver-1", isActive: true, isSynthetic: false }],
    ["caregiver-no-role", { id: "caregiver-no-role-1", isActive: true, isSynthetic: true }],
  ]);
  readonly activeRoles = new Map<string, ReadonlySet<"patient" | "clinician" | "caregiver">>([
    ["patient-1", new Set(["patient"])],
    ["clinician-1", new Set(["clinician"])],
    ["caregiver-1", new Set(["caregiver"])],
    ["inactive-caregiver-1", new Set(["caregiver"])],
    ["external-caregiver-1", new Set(["caregiver"])],
  ]);
  readonly policies = new Map<
    string,
    {
      readonly id: string;
      readonly recordType: LegalRecordType;
      readonly state: "PENDING" | "APPROVED";
      readonly scope: string;
    }
  >([
    [
      "pilot-v1",
      {
        id: "pilot-v1",
        recordType: "PARTICIPATION" as const,
        state: "PENDING" as const,
        scope: "pilot",
      },
    ],
    [
      "pilot-v2",
      {
        id: "pilot-v2",
        recordType: "PARTICIPATION" as const,
        state: "APPROVED" as const,
        scope: "pilot",
      },
    ],
    [
      "caregiver-v1",
      {
        id: "caregiver-v1",
        recordType: "CAREGIVER_AUTHORIZATION" as const,
        state: "APPROVED" as const,
        scope: "caregiver:appointments",
      },
    ],
    [
      "caregiver-portal-v1",
      {
        id: "caregiver-portal-v1",
        recordType: "CAREGIVER_AUTHORIZATION" as const,
        state: "APPROVED" as const,
        scope: "caregiver:portal",
      },
    ],
  ]);

  async run<T>(operation: (transaction: LegalRecordsTransaction) => Promise<T>): Promise<T> {
    return operation(this);
  }
  async resolveSyntheticUser(alias: string) {
    return this.users.get(alias) ?? null;
  }
  async isActiveUserWithRole(userId: string, role: "patient" | "clinician" | "caregiver") {
    return this.activeRoles.get(userId)?.has(role) ?? false;
  }
  async getPolicyVersion(id: string) {
    return this.policies.get(id) ?? null;
  }
  async createLegalRecord(input: LegalRecordCreateInput) {
    this.records.push(input);
    return { id: `record-${this.records.length}` };
  }
  async getLegalRecord(type: LegalRecordType, id: string) {
    const index = Number(id.replace("record-", "")) - 1;
    const record = this.records[index];
    return record && record.recordType === type
      ? {
          id,
          recordType: type,
          subjectUserId: record.subjectUserId,
          scope: record.scope,
          policyVersionId: record.policyVersionId,
        }
      : null;
  }
  async hasRevocation(type: LegalRecordType, id: string) {
    return this.revocations.some(
      (revocation) => revocation.targetType === type && revocation.targetRecordId === id,
    );
  }
  async createRevocation(input: Parameters<LegalRecordsTransaction["createRevocation"]>[0]) {
    this.revocations.push(input);
    return { id: `revocation-${this.revocations.length}` };
  }
  async revokeCaregiverSessions() {
    this.revokedCaregiverSessionCount += 1;
    return 1;
  }
  async appendCaregiverAccessAudit(
    input: Parameters<LegalRecordsTransaction["appendCaregiverAccessAudit"]>[0],
  ) {
    this.caregiverAccessAudits.push(input);
    return { id: `caregiver-audit-${this.caregiverAccessAudits.length}` };
  }
  async appendAuditEvent(input: NewAuditEvent) {
    this.auditEvents.push(input);
    return { id: `audit-${this.auditEvents.length}` };
  }
}

const patient = { userId: "patient-1", roles: ["patient" as const], sessionId: "session-1" };
const correlationId = "018f673a-4e35-7060-99b5-7bc6feba3a97";

function addTarget(
  store: MemoryLegalUnitOfWork,
  recordType: LegalRecordType,
  subjectUserId = "patient-1",
) {
  store.records.push({
    recordType,
    subjectUserId,
    state: "ACTIVE",
    scope: recordType === "PROCESSING_BASIS" ? "care-treatment" : "pilot",
    policyVersionId: "pilot-v2",
    actorUserId: subjectUserId,
    recordedAt: new Date("2026-07-16T09:00:00Z"),
    expiresAt: null,
    origin: "DEMO_UI",
    evidenceType: "RECORDED_INTERACTION",
    evidenceRef: "SYNTHETIC",
    channel: null,
    purpose: null,
    caregiverUserId: null,
    basisCode: null,
  });
  return `record-${store.records.length}`;
}

describe("RecordLegalDecisionService", () => {
  it.each([
    [
      "tipo",
      { id: "wrong-type", recordType: "PROCESSING_BASIS", state: "APPROVED", scope: "pilot" },
    ],
    [
      "scope",
      { id: "wrong-scope", recordType: "PARTICIPATION", state: "APPROVED", scope: "check-ins" },
    ],
  ] as const)(
    "rechaza una política con %s incompatible durante la creación",
    async (_label, policy) => {
      const store = new MemoryLegalUnitOfWork();
      store.policies.set(policy.id, policy);
      await expect(
        new RecordLegalDecisionService(store).record({
          actor: patient,
          subjectAlias: "demo-patient",
          recordType: "PARTICIPATION",
          state: "ACTIVE",
          policyVersionId: policy.id,
          correlationId,
        }),
      ).rejects.toBeInstanceOf(LegalRecordInvalidError);
      expect(store.records).toHaveLength(0);
    },
  );

  it.each(["demo-support", "demo-admin", "demo-caregiver", "synthetic-no-role"])(
    "rechaza %s como sujeto del registro jurídico",
    async (subjectAlias) => {
      const store = new MemoryLegalUnitOfWork();
      await expect(
        new RecordLegalDecisionService(store).record({
          actor: { userId: "clinician-1", roles: ["clinician"], sessionId: "session-clinician" },
          subjectAlias,
          recordType: "PARTICIPATION",
          state: "PENDING",
          policyVersionId: "pilot-v1",
          correlationId,
        }),
      ).rejects.toBeInstanceOf(LegalRecordDeniedError);
      expect(store.records).toHaveLength(0);
    },
  );

  it.each([
    ["patient inactivo", { id: "patient-1", isActive: false, isSynthetic: true }],
    ["usuario no sintético", { id: "patient-1", isActive: true, isSynthetic: false }],
  ] satisfies readonly [string, MemoryUser][])(
    "rechaza como sujeto canónico un %s",
    async (_label, subject) => {
      const store = new MemoryLegalUnitOfWork();
      store.users.set("demo-patient", subject);
      await expect(
        new RecordLegalDecisionService(store).record({
          actor: { userId: "clinician-1", roles: ["clinician"], sessionId: "session-clinician" },
          subjectAlias: "demo-patient",
          recordType: "PARTICIPATION",
          state: "PENDING",
          policyVersionId: "pilot-v1",
          correlationId,
        }),
      ).rejects.toBeInstanceOf(LegalRecordDeniedError);
      expect(store.records).toHaveLength(0);
    },
  );

  it("rechaza el sujeto canónico si no conserva el rol patient activo", async () => {
    const store = new MemoryLegalUnitOfWork();
    store.activeRoles.delete("patient-1");
    await expect(
      new RecordLegalDecisionService(store).record({
        actor: { userId: "clinician-1", roles: ["clinician"], sessionId: "session-clinician" },
        subjectAlias: "demo-patient",
        recordType: "PARTICIPATION",
        state: "PENDING",
        policyVersionId: "pilot-v1",
        correlationId,
      }),
    ).rejects.toBeInstanceOf(LegalRecordDeniedError);
  });

  it.each([
    "demo-patient",
    "demo-support",
    "demo-admin",
    "demo-clinician",
    "inactive-caregiver",
    "external-caregiver",
    "caregiver-no-role",
  ])("rechaza %s como identidad de cuidador", async (caregiverAlias) => {
    const store = new MemoryLegalUnitOfWork();
    await expect(
      new RecordLegalDecisionService(store).record({
        actor: patient,
        subjectAlias: "demo-patient",
        recordType: "CAREGIVER_AUTHORIZATION",
        state: "ACTIVE",
        policyVersionId: "caregiver-v1",
        caregiverAlias,
        scope: "caregiver:appointments",
        correlationId,
      }),
    ).rejects.toBeInstanceOf(LegalRecordDeniedError);
    expect(store.records).toHaveLength(0);
  });

  it("solo el paciente puede otorgar autorización al cuidador", async () => {
    const store = new MemoryLegalUnitOfWork();
    const service = new RecordLegalDecisionService(store);
    await expect(
      service.record({
        actor: { userId: "clinician-1", roles: ["clinician"], sessionId: "session-clinician" },
        subjectAlias: "demo-patient",
        recordType: "CAREGIVER_AUTHORIZATION",
        state: "ACTIVE",
        policyVersionId: "caregiver-v1",
        caregiverAlias: "demo-caregiver",
        scope: "caregiver:appointments",
        correlationId,
      }),
    ).rejects.toBeInstanceOf(LegalRecordDeniedError);
    expect(store.records).toHaveLength(0);
  });

  it("admite el scope portal únicamente con la policy del mismo alcance", async () => {
    const store = new MemoryLegalUnitOfWork();
    await new RecordLegalDecisionService(store).record({
      actor: patient,
      subjectAlias: "demo-patient",
      recordType: "CAREGIVER_AUTHORIZATION",
      state: "ACTIVE",
      policyVersionId: "caregiver-portal-v1",
      caregiverAlias: "demo-caregiver",
      scope: "caregiver:portal",
      correlationId,
    });
    expect(store.records.at(-1)).toMatchObject({ scope: "caregiver:portal" });
  });

  it("una revocación solo añade evento y conserva episodios, planes y registros previos", async () => {
    const store = new MemoryLegalUnitOfWork();
    const service = new RecordLegalDecisionService(store, () => new Date("2026-07-16T10:00:00Z"));
    const created = await service.record({
      actor: patient,
      subjectAlias: "demo-patient",
      recordType: "CAREGIVER_AUTHORIZATION",
      state: "ACTIVE",
      policyVersionId: "caregiver-v1",
      caregiverAlias: "demo-caregiver",
      scope: "caregiver:appointments",
      correlationId,
    });

    await service.revoke({
      actor: patient,
      targetType: "CAREGIVER_AUTHORIZATION",
      targetRecordId: created.recordId,
      correlationId,
    });

    expect(store.revocations).toHaveLength(1);
    expect(store.records).toHaveLength(1);
    expect(store.episodes).toEqual(["synthetic-episode-1"]);
    expect(store.plans).toEqual(["synthetic-plan-v1"]);
    expect(store.observations).toEqual(["synthetic-observation-1"]);
  });

  it.each([
    "PARTICIPATION",
    "DIGITAL_PARTICIPATION",
    "COMMUNICATION_PERMISSION",
    "CAREGIVER_AUTHORIZATION",
  ] as const)("permite al paciente revocar su propio %s", async (targetType) => {
    const store = new MemoryLegalUnitOfWork();
    const targetRecordId = addTarget(store, targetType);
    await expect(
      new RecordLegalDecisionService(store).revoke({
        actor: patient,
        targetType,
        targetRecordId,
        correlationId,
      }),
    ).resolves.toMatchObject({ revocationId: "revocation-1" });
  });

  it("impide al paciente revocar PROCESSING_BASIS", async () => {
    const store = new MemoryLegalUnitOfWork();
    const targetRecordId = addTarget(store, "PROCESSING_BASIS");
    await expect(
      new RecordLegalDecisionService(store).revoke({
        actor: patient,
        targetType: "PROCESSING_BASIS",
        targetRecordId,
        correlationId,
      }),
    ).rejects.toBeInstanceOf(LegalRecordDeniedError);
    expect(store.revocations).toHaveLength(0);
  });

  it.each([
    "PARTICIPATION",
    "DIGITAL_PARTICIPATION",
    "COMMUNICATION_PERMISSION",
    "CAREGIVER_AUTHORIZATION",
    "PROCESSING_BASIS",
  ] as const)(
    "impide al clínico revocar %s mientras las decisiones siguen pendientes",
    async (targetType) => {
      const store = new MemoryLegalUnitOfWork();
      const targetRecordId = addTarget(store, targetType);
      await expect(
        new RecordLegalDecisionService(store).revoke({
          actor: { userId: "clinician-1", roles: ["clinician"], sessionId: "session-clinician" },
          targetType,
          targetRecordId,
          correlationId,
        }),
      ).rejects.toBeInstanceOf(LegalRecordDeniedError);
      expect(store.revocations).toHaveLength(0);
    },
  );

  it("un cambio de versión de política conserva el registro anterior", async () => {
    const store = new MemoryLegalUnitOfWork();
    const service = new RecordLegalDecisionService(store);
    await service.record({
      actor: patient,
      subjectAlias: "demo-patient",
      recordType: "PARTICIPATION",
      state: "PENDING",
      policyVersionId: "pilot-v1",
      correlationId,
    });
    await service.record({
      actor: patient,
      subjectAlias: "demo-patient",
      recordType: "PARTICIPATION",
      state: "ACTIVE",
      policyVersionId: "pilot-v2",
      correlationId,
    });
    expect(store.records.map(({ policyVersionId }) => policyVersionId)).toEqual([
      "pilot-v1",
      "pilot-v2",
    ]);
  });

  it("la auditoría de revocación no incluye contenido clínico ni evidencia libre", async () => {
    const store = new MemoryLegalUnitOfWork();
    const service = new RecordLegalDecisionService(store);
    const created = await service.record({
      actor: patient,
      subjectAlias: "demo-patient",
      recordType: "CAREGIVER_AUTHORIZATION",
      state: "ACTIVE",
      policyVersionId: "caregiver-v1",
      caregiverAlias: "demo-caregiver",
      scope: "caregiver:appointments",
      correlationId,
    });
    await service.revoke({
      actor: patient,
      targetType: "CAREGIVER_AUTHORIZATION",
      targetRecordId: created.recordId,
      correlationId,
    });
    const serializedAudit = JSON.stringify(store.auditEvents);
    expect(serializedAudit).not.toContain("diagnóstico");
    expect(serializedAudit).not.toContain("DEMO-SYNTHETIC-ACK");
    expect(store.auditEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "LEGAL_RECORD_REVOKED",
          resourceType: "RevocationEvent",
        }),
        expect.objectContaining({
          action: "CAREGIVER_ACCESS_REVOKED",
          resourceType: "CaregiverAuthorization",
          resourceId: created.recordId,
        }),
      ]),
    );
    expect(store.revokedCaregiverSessionCount).toBe(1);
    expect(store.caregiverAccessAudits).toEqual([
      expect.objectContaining({
        action: "ACCESS_REVOKED",
        resourceType: "CaregiverAuthorization",
        resourceId: created.recordId,
      }),
    ]);
  });
});
