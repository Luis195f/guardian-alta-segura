import type { HomeSafetyUnitOfWork } from "@/application/ports/home-safety-unit-of-work";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import { HOME_SAFETY_TEMPLATE, parseHomeSafetySubmission } from "@/domain/home-safety/home-safety";

export class HomeSafetyDeniedError extends Error {}
export class HomeSafetyNotFoundError extends Error {}
export class HomeSafetyConflictError extends Error {}

export class CreateHomeSafetyVersionService {
  constructor(
    private readonly unitOfWork: HomeSafetyUnitOfWork,
    private readonly now: () => Date = () => new Date(),
  ) {}

  execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly episodeId: string;
    readonly expectedPreviousVersion: unknown;
    readonly informationalPurposeAcknowledged: unknown;
    readonly humanReviewed: unknown;
    readonly items: unknown;
    readonly correlationId: string;
  }) {
    const parsed = parseHomeSafetySubmission(input);
    return this.unitOfWork.run(async (transaction) => {
      const episode = await transaction.getEpisode(input.episodeId);
      if (!episode) throw new HomeSafetyNotFoundError();
      if (!episode.isSynthetic) throw new HomeSafetyDeniedError();

      let actingRole: "nurse" | "clinician" | null = null;
      for (const role of ["nurse", "clinician"] as const) {
        if (
          input.actor.roles.includes(role) &&
          (episode.responsibleNurseId === input.actor.userId ||
            episode.responsibleClinicianId === input.actor.userId) &&
          (await transaction.isActiveUserWithRole(input.actor.userId, role))
        ) {
          actingRole = role;
          break;
        }
      }
      if (!actingRole) throw new HomeSafetyDeniedError();

      const latestVersion = await transaction.getLatestVersionNumber(episode.id);
      if (latestVersion !== parsed.expectedPreviousVersion) throw new HomeSafetyConflictError();
      const recordedAt = this.now();
      const version = await transaction.createVersion({
        episodeId: episode.id,
        versionNumber: latestVersion + 1,
        templateKey: HOME_SAFETY_TEMPLATE.key,
        templateVersion: HOME_SAFETY_TEMPLATE.version,
        informationalPurposeAcknowledged: true,
        humanReviewed: parsed.humanReviewed,
        actorUserId: input.actor.userId,
        recordedAt,
        items: parsed.items,
      });
      await transaction.appendAuditEvent({
        actorUserId: input.actor.userId,
        actorRole: actingRole,
        action: "HOME_SAFETY_VERSION_CREATED",
        resourceType: "HomeSafetyReviewVersion",
        resourceId: version.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt: recordedAt,
      });
      return { versionId: version.id, versionNumber: latestVersion + 1 };
    });
  }
}
