import {
  RevocationConflictError,
  type LegalRecordsTransaction,
  type LegalRecordsUnitOfWork,
} from "@/application/ports/legal-records-unit-of-work";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import { communicationScope } from "@/domain/legal/legal-authorization";
import type {
  CommunicationChannel,
  LegalRecordState,
  LegalRecordType,
} from "@/domain/legal/legal-records";
import {
  authorizeLegalRecordCreation,
  type LegalCreationActorRole,
} from "@/domain/legal/creation-policy";
import { authorizeLegalRevocation } from "@/domain/legal/revocation-policy";

export class LegalRecordDeniedError extends Error {}
export class LegalRecordInvalidError extends Error {}
export class LegalRecordConflictError extends Error {}

const caregiverScopes = [
  "caregiver:safety-plan-summary",
  "caregiver:appointments",
  "caregiver:portal",
] as const;
const processingScopes = [
  "care-treatment",
  "communication:email:check-in",
  "communication:sms:check-in",
  "communication:push:check-in",
] as const;

export class RecordLegalDecisionService {
  constructor(
    private readonly unitOfWork: LegalRecordsUnitOfWork,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async record(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly subjectAlias: string;
    readonly recordType: LegalRecordType;
    readonly state: LegalRecordState;
    readonly policyVersionId: string;
    readonly correlationId: string;
    readonly channel?: CommunicationChannel;
    readonly purpose?: string;
    readonly caregiverAlias?: string;
    readonly scope?: string;
    readonly basisCode?: string;
    readonly expiresAt?: Date | null;
  }): Promise<{ readonly recordId: string }> {
    const recordedAt = this.now();
    return this.unitOfWork.run(async (transaction) => {
      const subject = await transaction.resolveSyntheticUser(input.subjectAlias);
      const subjectIsActivePatient =
        subject?.isActive &&
        subject.isSynthetic &&
        (await transaction.isActiveUserWithRole(subject.id, "patient"));
      if (input.subjectAlias !== "demo-patient" || !subject || !subjectIsActivePatient) {
        throw new LegalRecordDeniedError();
      }

      const actingAsClinician =
        input.actor.roles.includes("clinician") &&
        (await transaction.isActiveUserWithRole(input.actor.userId, "clinician"));
      const actingAsPatient =
        input.actor.roles.includes("patient") &&
        input.actor.userId === subject.id &&
        (await transaction.isActiveUserWithRole(input.actor.userId, "patient"));
      const actorRole = (
        [
          ...(actingAsPatient ? (["patient"] as const) : []),
          ...(actingAsClinician ? (["clinician"] as const) : []),
        ] as readonly LegalCreationActorRole[]
      ).find(
        (role) =>
          authorizeLegalRecordCreation({
            actorRole: role,
            recordType: input.recordType,
            ownsSubject: input.actor.userId === subject.id,
          }).allowed,
      );
      if (!actorRole) throw new LegalRecordDeniedError();

      const details = await this.resolveDetails(input, transaction, subject.id);
      const policy = await transaction.getPolicyVersion(input.policyVersionId);
      if (
        !policy ||
        policy.id !== input.policyVersionId ||
        policy.recordType !== input.recordType ||
        policy.scope !== details.scope
      ) {
        throw new LegalRecordInvalidError();
      }

      const created = await transaction.createLegalRecord({
        recordType: input.recordType,
        subjectUserId: subject.id,
        state: input.state,
        scope: details.scope,
        policyVersionId: policy.id,
        actorUserId: input.actor.userId,
        recordedAt,
        expiresAt: input.expiresAt ?? null,
        origin: "DEMO_UI",
        evidenceType: "RECORDED_INTERACTION",
        evidenceRef: "DEMO-SYNTHETIC-ACK",
        channel: details.channel,
        purpose: details.purpose,
        caregiverUserId: details.caregiverUserId,
        basisCode: details.basisCode,
      });
      await transaction.appendAuditEvent({
        actorUserId: input.actor.userId,
        actorRole,
        action: "LEGAL_RECORD_CREATED",
        resourceType: input.recordType,
        resourceId: created.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt: recordedAt,
      });
      return { recordId: created.id };
    });
  }

  async revoke(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly targetType: LegalRecordType;
    readonly targetRecordId: string;
    readonly correlationId: string;
  }): Promise<{ readonly revocationId: string }> {
    const recordedAt = this.now();
    try {
      return await this.unitOfWork.run(async (transaction) => {
        const target = await transaction.getLegalRecord(input.targetType, input.targetRecordId);
        if (!target) throw new LegalRecordInvalidError();

        const actingAsPatient =
          input.actor.roles.includes("patient") &&
          (await transaction.isActiveUserWithRole(input.actor.userId, "patient"));
        const actingAsClinician =
          input.actor.roles.includes("clinician") &&
          (await transaction.isActiveUserWithRole(input.actor.userId, "clinician"));
        const actorRole = actingAsPatient ? "patient" : actingAsClinician ? "clinician" : null;
        if (
          !actorRole ||
          !authorizeLegalRevocation({
            actorRole,
            targetType: input.targetType,
            ownsSubject: input.actor.userId === target.subjectUserId,
          }).allowed
        ) {
          throw new LegalRecordDeniedError();
        }
        if (await transaction.hasRevocation(input.targetType, input.targetRecordId)) {
          throw new LegalRecordConflictError();
        }

        const revocation = await transaction.createRevocation({
          state: "REVOKED",
          targetType: input.targetType,
          targetRecordId: input.targetRecordId,
          subjectUserId: target.subjectUserId,
          scope: target.scope,
          policyVersionId: target.policyVersionId,
          actorUserId: input.actor.userId,
          recordedAt,
          origin: "DEMO_UI",
          evidenceType: "RECORDED_INTERACTION",
          evidenceRef: "DEMO-SYNTHETIC-REVOCATION",
        });
        if (target.recordType === "CAREGIVER_AUTHORIZATION") {
          await transaction.revokeCaregiverSessions(target.id, recordedAt);
          await transaction.appendCaregiverAccessAudit({
            caregiverAuthorizationId: target.id,
            actorUserId: input.actor.userId,
            action: "ACCESS_REVOKED",
            outcome: "SUCCESS",
            resourceType: "CaregiverAuthorization",
            resourceId: target.id,
            correlationId: input.correlationId,
            createdAt: recordedAt,
          });
        }
        await transaction.appendAuditEvent({
          actorUserId: input.actor.userId,
          actorRole: "patient",
          action: "LEGAL_RECORD_REVOKED",
          resourceType: "RevocationEvent",
          resourceId: revocation.id,
          outcome: "SUCCESS",
          correlationId: input.correlationId,
          createdAt: recordedAt,
        });
        if (target.recordType === "CAREGIVER_AUTHORIZATION") {
          await transaction.appendAuditEvent({
            actorUserId: input.actor.userId,
            actorRole: "patient",
            action: "CAREGIVER_ACCESS_REVOKED",
            resourceType: "CaregiverAuthorization",
            resourceId: target.id,
            outcome: "SUCCESS",
            correlationId: input.correlationId,
            createdAt: recordedAt,
          });
        }
        return { revocationId: revocation.id };
      });
    } catch (error) {
      if (error instanceof RevocationConflictError) throw new LegalRecordConflictError();
      throw error;
    }
  }

  private async resolveDetails(
    input: {
      readonly recordType: LegalRecordType;
      readonly channel?: CommunicationChannel;
      readonly purpose?: string;
      readonly caregiverAlias?: string;
      readonly scope?: string;
      readonly basisCode?: string;
    },
    transaction: LegalRecordsTransaction,
    subjectUserId: string,
  ): Promise<{
    scope: string;
    channel: CommunicationChannel | null;
    purpose: string | null;
    caregiverUserId: string | null;
    basisCode: string | null;
  }> {
    if (input.recordType === "PARTICIPATION") {
      return {
        scope: "pilot",
        channel: null,
        purpose: null,
        caregiverUserId: null,
        basisCode: null,
      };
    }
    if (input.recordType === "DIGITAL_PARTICIPATION") {
      return {
        scope: "check-ins",
        channel: null,
        purpose: null,
        caregiverUserId: null,
        basisCode: null,
      };
    }
    if (input.recordType === "COMMUNICATION_PERMISSION") {
      if (!input.channel || input.purpose !== "check-in") throw new LegalRecordInvalidError();
      return {
        scope: communicationScope(input.channel, input.purpose),
        channel: input.channel,
        purpose: input.purpose,
        caregiverUserId: null,
        basisCode: null,
      };
    }
    if (input.recordType === "CAREGIVER_AUTHORIZATION") {
      if (
        !input.caregiverAlias ||
        !caregiverScopes.includes(input.scope as (typeof caregiverScopes)[number])
      ) {
        throw new LegalRecordInvalidError();
      }
      const caregiver = await transaction.resolveSyntheticUser(input.caregiverAlias);
      const caregiverIsValid =
        caregiver?.isActive &&
        caregiver.isSynthetic &&
        caregiver.id !== subjectUserId &&
        (await transaction.isActiveUserWithRole(caregiver.id, "caregiver"));
      if (!caregiver || !caregiverIsValid) throw new LegalRecordDeniedError();
      return {
        scope: input.scope!,
        channel: null,
        purpose: null,
        caregiverUserId: caregiver.id,
        basisCode: null,
      };
    }
    if (
      !input.basisCode ||
      input.basisCode.length > 64 ||
      !/^[A-Z0-9_-]+$/.test(input.basisCode) ||
      !processingScopes.includes(input.scope as (typeof processingScopes)[number])
    ) {
      throw new LegalRecordInvalidError();
    }
    return {
      scope: input.scope!,
      channel: null,
      purpose: null,
      caregiverUserId: null,
      basisCode: input.basisCode,
    };
  }
}
