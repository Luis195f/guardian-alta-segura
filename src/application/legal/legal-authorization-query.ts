import type { CommunicationChannel } from "@/domain/legal/legal-records";
import { LegalAuthorizationService } from "@/domain/legal/legal-authorization";
import { prisma } from "@/infrastructure/persistence/prisma";

const authorization = new LegalAuthorizationService();

export class LegalAuthorizationQueryService {
  async authorizeCommunication(input: {
    readonly subjectUserId: string;
    readonly channel: CommunicationChannel;
    readonly purpose: string;
    readonly now?: Date;
  }) {
    const [permissions, processingBasisRecords, policies, revocations] = await Promise.all([
      prisma.communicationPermission.findMany({
        where: {
          subjectUserId: input.subjectUserId,
          channel: input.channel,
          purpose: input.purpose,
        },
      }),
      prisma.processingBasisRecord.findMany({ where: { subjectUserId: input.subjectUserId } }),
      prisma.policyVersion.findMany(),
      prisma.revocationEvent.findMany({ where: { subjectUserId: input.subjectUserId } }),
    ]);
    return authorization.authorizeCommunication({
      ...input,
      permissions: permissions.map((record) => ({
        ...record,
        recordType: "COMMUNICATION_PERMISSION" as const,
      })),
      processingBasisRecords: processingBasisRecords.map((record) => ({
        ...record,
        recordType: "PROCESSING_BASIS" as const,
      })),
      policies,
      revocations,
      now: input.now ?? new Date(),
    });
  }

  async authorizeFutureCheckIn(input: {
    readonly subjectUserId: string;
    readonly featureEnabled: boolean;
    readonly now?: Date;
  }) {
    const [records, policies, revocations] = await Promise.all([
      prisma.digitalParticipationRecord.findMany({ where: { subjectUserId: input.subjectUserId } }),
      prisma.policyVersion.findMany(),
      prisma.revocationEvent.findMany({ where: { subjectUserId: input.subjectUserId } }),
    ]);
    return authorization.authorizeFutureCheckIn({
      ...input,
      records: records.map((record) => ({
        ...record,
        recordType: "DIGITAL_PARTICIPATION" as const,
      })),
      policies,
      revocations,
      now: input.now ?? new Date(),
    });
  }

  async authorizeCaregiverAccess(input: {
    readonly subjectUserId: string;
    readonly caregiverUserId: string;
    readonly requestedScope: string;
    readonly now?: Date;
  }) {
    const [records, policies, revocations] = await Promise.all([
      prisma.caregiverAuthorization.findMany({
        where: { subjectUserId: input.subjectUserId, caregiverUserId: input.caregiverUserId },
      }),
      prisma.policyVersion.findMany(),
      prisma.revocationEvent.findMany({ where: { subjectUserId: input.subjectUserId } }),
    ]);
    return authorization.authorizeCaregiverAccess({
      ...input,
      records: records.map((record) => ({
        ...record,
        recordType: "CAREGIVER_AUTHORIZATION" as const,
      })),
      policies,
      revocations,
      now: input.now ?? new Date(),
    });
  }
}
