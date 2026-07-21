import { Prisma } from "@prisma/client";

import type {
  LegalRecordCreateInput,
  LegalRecordsTransaction,
  LegalRecordsUnitOfWork,
} from "@/application/ports/legal-records-unit-of-work";
import { RevocationConflictError } from "@/application/ports/legal-records-unit-of-work";
import type { NewAuditEvent } from "@/domain/audit/audit-event";
import type { LegalRecordType } from "@/domain/legal/legal-records";
import { prisma } from "@/infrastructure/persistence/prisma";

class PrismaLegalRecordsTransaction implements LegalRecordsTransaction {
  constructor(private readonly transaction: Prisma.TransactionClient) {}

  async resolveSyntheticUser(alias: string) {
    return this.transaction.user.findUnique({
      where: { syntheticAlias: alias },
      select: { id: true, isActive: true, isSynthetic: true },
    });
  }

  async isActiveUserWithRole(userId: string, role: "patient" | "clinician" | "caregiver") {
    return (
      (await this.transaction.user.findFirst({
        where: {
          id: userId,
          isActive: true,
          roleAssignments: { some: { role, revokedAt: null } },
        },
        select: { id: true },
      })) !== null
    );
  }

  async getPolicyVersion(id: string) {
    return this.transaction.policyVersion.findUnique({
      where: { id },
      select: { id: true, recordType: true, state: true, scope: true },
    });
  }

  async createLegalRecord(input: LegalRecordCreateInput): Promise<{ readonly id: string }> {
    const common = {
      subjectUserId: input.subjectUserId,
      state: input.state,
      scope: input.scope,
      policyVersionId: input.policyVersionId,
      actorUserId: input.actorUserId,
      recordedAt: input.recordedAt,
      expiresAt: input.expiresAt,
      origin: input.origin,
      evidenceType: input.evidenceType,
      evidenceRef: input.evidenceRef,
    };
    switch (input.recordType) {
      case "PARTICIPATION":
        return this.transaction.participationRecord.create({ data: common, select: { id: true } });
      case "DIGITAL_PARTICIPATION":
        return this.transaction.digitalParticipationRecord.create({
          data: common,
          select: { id: true },
        });
      case "COMMUNICATION_PERMISSION":
        if (!input.channel || !input.purpose) throw new Error("Invalid communication record");
        return this.transaction.communicationPermission.create({
          data: { ...common, channel: input.channel, purpose: input.purpose },
          select: { id: true },
        });
      case "CAREGIVER_AUTHORIZATION":
        if (!input.caregiverUserId) throw new Error("Invalid caregiver authorization");
        return this.transaction.caregiverAuthorization.create({
          data: { ...common, caregiverUserId: input.caregiverUserId },
          select: { id: true },
        });
      case "PROCESSING_BASIS":
        if (!input.basisCode) throw new Error("Invalid processing basis record");
        return this.transaction.processingBasisRecord.create({
          data: { ...common, basisCode: input.basisCode },
          select: { id: true },
        });
    }
  }

  async getLegalRecord(type: LegalRecordType, id: string) {
    const select = {
      id: true,
      subjectUserId: true,
      scope: true,
      policyVersionId: true,
    } as const;
    let record: {
      id: string;
      subjectUserId: string;
      scope: string;
      policyVersionId: string;
    } | null;
    switch (type) {
      case "PARTICIPATION":
        record = await this.transaction.participationRecord.findUnique({ where: { id }, select });
        break;
      case "DIGITAL_PARTICIPATION":
        record = await this.transaction.digitalParticipationRecord.findUnique({
          where: { id },
          select,
        });
        break;
      case "COMMUNICATION_PERMISSION":
        record = await this.transaction.communicationPermission.findUnique({
          where: { id },
          select,
        });
        break;
      case "CAREGIVER_AUTHORIZATION":
        record =
          (
            await this.transaction.$queryRaw<
              {
                id: string;
                subjectUserId: string;
                scope: string;
                policyVersionId: string;
              }[]
            >(Prisma.sql`
              SELECT
                "id",
                "subject_user_id" AS "subjectUserId",
                "scope",
                "policy_version_id" AS "policyVersionId"
              FROM "caregiver_authorizations"
              WHERE "id" = ${id}
              FOR UPDATE
            `)
          )[0] ?? null;
        break;
      case "PROCESSING_BASIS":
        record = await this.transaction.processingBasisRecord.findUnique({ where: { id }, select });
        break;
    }
    return record ? { ...record, recordType: type } : null;
  }

  async hasRevocation(type: LegalRecordType, id: string): Promise<boolean> {
    return (
      (await this.transaction.revocationEvent.findFirst({
        where: { targetType: type, targetRecordId: id },
        select: { id: true },
      })) !== null
    );
  }

  async createRevocation(input: Parameters<LegalRecordsTransaction["createRevocation"]>[0]) {
    try {
      return await this.transaction.revocationEvent.create({ data: input, select: { id: true } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new RevocationConflictError();
      }
      throw error;
    }
  }

  async revokeCaregiverSessions(caregiverAuthorizationId: string, revokedAt: Date) {
    const result = await this.transaction.caregiverSession.updateMany({
      where: { caregiverAuthorizationId, revokedAt: null },
      data: { revokedAt },
    });
    return result.count;
  }

  async appendCaregiverAccessAudit(
    input: Parameters<LegalRecordsTransaction["appendCaregiverAccessAudit"]>[0],
  ) {
    return this.transaction.caregiverAccessAudit.create({ data: input, select: { id: true } });
  }

  async appendAuditEvent(input: NewAuditEvent) {
    return this.transaction.auditEvent.create({ data: input, select: { id: true } });
  }
}

export class PrismaLegalRecordsUnitOfWork implements LegalRecordsUnitOfWork {
  async run<T>(operation: (transaction: LegalRecordsTransaction) => Promise<T>): Promise<T> {
    return prisma.$transaction((transaction) =>
      operation(new PrismaLegalRecordsTransaction(transaction)),
    );
  }
}
