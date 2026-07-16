import { describe, expect, it } from "vitest";

import { LegalAuthorizationService } from "@/domain/legal/legal-authorization";
import type {
  CaregiverAuthorization,
  CommunicationPermission,
  DigitalParticipationRecord,
  LegalRecordType,
  PolicyVersion,
  ProcessingBasisRecord,
  RevocationEvent,
} from "@/domain/legal/legal-records";

const now = new Date("2026-07-16T10:00:00.000Z");
const common = {
  subjectUserId: "patient-1",
  state: "ACTIVE" as const,
  actorUserId: "clinician-1",
  recordedAt: new Date("2026-07-16T09:00:00.000Z"),
  expiresAt: null,
  origin: "PROFESSIONAL_ENTRY" as const,
  evidenceType: "RECORDED_INTERACTION" as const,
  evidenceRef: "synthetic-evidence-ref",
};

function policy(
  id: string,
  recordType: LegalRecordType,
  scope: string,
  state: PolicyVersion["state"] = "APPROVED",
): PolicyVersion {
  return {
    id,
    policyKey: `key-${id}`,
    version: "v1",
    recordType,
    state,
    scope,
    actorUserId: "admin-1",
    recordedAt: new Date("2026-07-15T09:00:00.000Z"),
    origin: "INSTITUTIONAL_CONFIGURATION",
    evidenceType: "INSTITUTIONAL_DECISION_REFERENCE",
    evidenceRef: "DEC-SYNTHETIC",
  };
}

function permission(id = "permission-1"): CommunicationPermission {
  return {
    ...common,
    id,
    recordType: "COMMUNICATION_PERMISSION",
    scope: "communication:email:check-in",
    policyVersionId: "communication-policy",
    channel: "EMAIL",
    purpose: "check-in",
  };
}

function communicationBasis(): ProcessingBasisRecord {
  return {
    ...common,
    id: "basis-communication",
    recordType: "PROCESSING_BASIS",
    scope: "communication:email:check-in",
    policyVersionId: "basis-policy",
    basisCode: "INSTITUTION_CONFIGURED_CODE",
  };
}

describe("LegalAuthorizationService", () => {
  const service = new LegalAuthorizationService();

  it("deniega comunicación sin permiso específico aunque exista base asistencial", () => {
    const careBasis: ProcessingBasisRecord = {
      ...common,
      id: "care-basis",
      recordType: "PROCESSING_BASIS",
      scope: "care-treatment",
      policyVersionId: "care-policy",
      basisCode: "INSTITUTION_CONFIGURED_CODE",
    };
    const decision = service.authorizeCommunication({
      subjectUserId: "patient-1",
      channel: "EMAIL",
      purpose: "check-in",
      permissions: [],
      processingBasisRecords: [careBasis],
      policies: [policy("care-policy", "PROCESSING_BASIS", "care-treatment")],
      revocations: [],
      now,
    });
    expect(decision).toMatchObject({ allowed: false, reason: "missing-specific-record" });
  });

  it("exige también una base institucional específica para el mismo canal y finalidad", () => {
    const decision = service.authorizeCommunication({
      subjectUserId: "patient-1",
      channel: "EMAIL",
      purpose: "check-in",
      permissions: [permission()],
      processingBasisRecords: [],
      policies: [
        policy("communication-policy", "COMMUNICATION_PERMISSION", "communication:email:check-in"),
      ],
      revocations: [],
      now,
    });
    expect(decision).toMatchObject({ allowed: false, reason: "missing-specific-record" });
  });

  it("permite comunicación solo con ambos registros específicos vigentes", () => {
    const decision = service.authorizeCommunication({
      subjectUserId: "patient-1",
      channel: "EMAIL",
      purpose: "check-in",
      permissions: [permission()],
      processingBasisRecords: [communicationBasis()],
      policies: [
        policy("communication-policy", "COMMUNICATION_PERMISSION", "communication:email:check-in"),
        policy("basis-policy", "PROCESSING_BASIS", "communication:email:check-in"),
      ],
      revocations: [],
      now,
    });
    expect(decision).toMatchObject({ allowed: true, reason: "allowed" });
  });

  it("una revocación del cuidador invalida exclusivamente ese acceso", () => {
    const caregiver: CaregiverAuthorization = {
      ...common,
      id: "caregiver-record",
      recordType: "CAREGIVER_AUTHORIZATION",
      caregiverUserId: "caregiver-1",
      scope: "caregiver:appointments",
      policyVersionId: "caregiver-policy",
    };
    const revocation: RevocationEvent = {
      id: "revocation-1",
      state: "REVOKED",
      targetType: "CAREGIVER_AUTHORIZATION",
      targetRecordId: caregiver.id,
      subjectUserId: caregiver.subjectUserId,
      scope: caregiver.scope,
      policyVersionId: caregiver.policyVersionId,
      actorUserId: "patient-1",
      recordedAt: new Date("2026-07-16T09:30:00.000Z"),
      origin: "DEMO_UI",
      evidenceType: "RECORDED_INTERACTION",
      evidenceRef: "synthetic-revocation",
    };
    expect(
      service.authorizeCaregiverAccess({
        subjectUserId: "patient-1",
        caregiverUserId: "caregiver-1",
        requestedScope: "caregiver:appointments",
        records: [caregiver],
        policies: [policy("caregiver-policy", "CAREGIVER_AUTHORIZATION", caregiver.scope)],
        revocations: [revocation],
        now,
      }),
    ).toMatchObject({ allowed: false, reason: "revoked" });
  });

  it("deniega un acceso concurrente cuando la autorización venció", () => {
    const caregiver: CaregiverAuthorization = {
      ...common,
      id: "expired-caregiver-record",
      recordType: "CAREGIVER_AUTHORIZATION",
      caregiverUserId: "caregiver-1",
      scope: "caregiver:appointments",
      policyVersionId: "caregiver-policy",
      expiresAt: new Date("2026-07-16T09:59:59.000Z"),
    };
    expect(
      service.authorizeCaregiverAccess({
        subjectUserId: "patient-1",
        caregiverUserId: "caregiver-1",
        requestedScope: caregiver.scope,
        records: [caregiver],
        policies: [policy("caregiver-policy", "CAREGIVER_AUTHORIZATION", caregiver.scope)],
        revocations: [],
        now,
      }),
    ).toMatchObject({ allowed: false, reason: "expired" });
  });

  it("la retirada digital detiene futuros check-ins sin depender del historial previo", () => {
    const digital: DigitalParticipationRecord = {
      ...common,
      id: "digital-record",
      recordType: "DIGITAL_PARTICIPATION",
      scope: "check-ins",
      policyVersionId: "digital-policy",
    };
    const revocation: RevocationEvent = {
      id: "digital-revocation",
      state: "REVOKED",
      targetType: "DIGITAL_PARTICIPATION",
      targetRecordId: digital.id,
      subjectUserId: digital.subjectUserId,
      scope: digital.scope,
      policyVersionId: digital.policyVersionId,
      actorUserId: "patient-1",
      recordedAt: now,
      origin: "DEMO_UI",
      evidenceType: "RECORDED_INTERACTION",
      evidenceRef: "synthetic-revocation",
    };
    expect(
      service.authorizeFutureCheckIn({
        subjectUserId: "patient-1",
        featureEnabled: true,
        records: [digital],
        policies: [policy("digital-policy", "DIGITAL_PARTICIPATION", "check-ins")],
        revocations: [revocation],
        now,
      }),
    ).toMatchObject({ allowed: false, reason: "revoked" });
  });

  it("una revocación con el mismo ID pero de otro tipo no invalida el registro", () => {
    const digital: DigitalParticipationRecord = {
      ...common,
      id: "shared-record-id",
      recordType: "DIGITAL_PARTICIPATION",
      scope: "check-ins",
      policyVersionId: "digital-policy",
    };
    const otherTypeRevocation: RevocationEvent = {
      id: "other-type-revocation",
      state: "REVOKED",
      targetType: "PARTICIPATION",
      targetRecordId: digital.id,
      subjectUserId: digital.subjectUserId,
      scope: "pilot",
      policyVersionId: "participation-policy",
      actorUserId: "patient-1",
      recordedAt: now,
      origin: "DEMO_UI",
      evidenceType: "RECORDED_INTERACTION",
      evidenceRef: "synthetic-revocation",
    };
    expect(
      service.authorizeFutureCheckIn({
        subjectUserId: "patient-1",
        featureEnabled: true,
        records: [digital],
        policies: [policy("digital-policy", "DIGITAL_PARTICIPATION", "check-ins")],
        revocations: [otherTypeRevocation],
        now,
      }),
    ).toMatchObject({ allowed: true, reason: "allowed" });
  });

  it.each([
    [
      "tipo incorrecto aprobado",
      policy("digital-policy", "PARTICIPATION", "check-ins"),
      false,
      "policy-record-type-mismatch",
    ],
    [
      "scope incorrecto aprobado",
      policy("digital-policy", "DIGITAL_PARTICIPATION", "pilot"),
      false,
      "policy-scope-mismatch",
    ],
    [
      "tipo y scope correctos pero pendiente",
      policy("digital-policy", "DIGITAL_PARTICIPATION", "check-ins", "PENDING"),
      false,
      "pending-local-validation",
    ],
    [
      "tipo y scope correctos y aprobado",
      policy("digital-policy", "DIGITAL_PARTICIPATION", "check-ins"),
      true,
      "allowed",
    ],
  ] as const)(
    "evalúa de forma segura una política con %s",
    (_label, configuredPolicy, allowed, reason) => {
      const digital: DigitalParticipationRecord = {
        ...common,
        id: "policy-consistency-record",
        recordType: "DIGITAL_PARTICIPATION",
        scope: "check-ins",
        policyVersionId: configuredPolicy.id,
      };
      expect(
        service.authorizeFutureCheckIn({
          subjectUserId: digital.subjectUserId,
          featureEnabled: true,
          records: [digital],
          policies: [configuredPolicy],
          revocations: [],
          now,
        }),
      ).toMatchObject({ allowed, reason });
    },
  );

  it("mantiene pending cuando la política carece de validación local", () => {
    const decision = service.authorizeCommunication({
      subjectUserId: "patient-1",
      channel: "EMAIL",
      purpose: "check-in",
      permissions: [permission()],
      processingBasisRecords: [communicationBasis()],
      policies: [
        policy(
          "communication-policy",
          "COMMUNICATION_PERMISSION",
          "communication:email:check-in",
          "PENDING",
        ),
        policy("basis-policy", "PROCESSING_BASIS", "communication:email:check-in"),
      ],
      revocations: [],
      now,
    });
    expect(decision).toMatchObject({ allowed: false, reason: "pending-local-validation" });
  });
});
