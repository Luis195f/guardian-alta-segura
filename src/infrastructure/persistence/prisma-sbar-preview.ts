import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import { buildDeterministicSbar } from "@/application/sbar/generate-deterministic-sbar";
import { prisma } from "@/infrastructure/persistence/prisma";
import {
  boundCollection,
  EXPOSED_COLLECTION_QUERY_TAKE,
} from "@/application/collections/bounded-collection";

export async function generateSbarPreview(
  principal: AuthenticatedPrincipal,
  episodeId: string,
  correlationId: string,
) {
  return prisma.$transaction(async (transaction) => {
    const roles = principal.roles.filter(
      (role): role is "nurse" | "clinician" => role === "nurse" || role === "clinician",
    );
    const [actor, episode] = await Promise.all([
      transaction.user.findFirst({
        where: {
          id: principal.userId,
          isActive: true,
          roleAssignments: { some: { role: { in: roles }, revokedAt: null } },
        },
        select: { id: true, syntheticAlias: true },
      }),
      transaction.dischargeEpisode.findFirst({
        where: {
          id: episodeId,
          patient: { isSynthetic: true },
          OR: [
            { responsibleNurseId: principal.userId },
            { responsibleClinicianId: principal.userId },
          ],
        },
        select: {
          id: true,
          status: true,
          dischargeDate: true,
          patient: { select: { isSynthetic: true, externalPseudonymousId: true } },
          checkInProtocolVersion: { select: { id: true, title: true, versionNumber: true } },
          safetyPlan: {
            select: {
              id: true,
              activeVersionNumber: true,
            },
          },
          checkInAssignments: {
            where: { outcome: { isNot: null } },
            orderBy: { outcome: { recordedAt: "desc" } },
            take: 1,
            select: { id: true, outcome: { select: { type: true, recordedAt: true } } },
          },
          alerts: {
            where: { currentState: "OPEN" },
            orderBy: [{ triggeredAt: "asc" }, { id: "asc" }],
            take: EXPOSED_COLLECTION_QUERY_TAKE,
            select: { id: true },
          },
          tasks: {
            where: { currentState: "OPEN" },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            take: EXPOSED_COLLECTION_QUERY_TAKE,
            select: { id: true, summary: true },
          },
        },
      }),
    ]);
    const actorRole = roles[0];
    if (!actor || !episode || !actorRole) return null;
    const generatedAt = new Date();
    const activeSafetyPlan =
      episode.safetyPlan && episode.safetyPlan.activeVersionNumber !== null
        ? await transaction.safetyPlanVersion.findUnique({
            where: {
              safetyPlanId_versionNumber: {
                safetyPlanId: episode.safetyPlan.id,
                versionNumber: episode.safetyPlan.activeVersionNumber,
              },
            },
            select: { id: true, versionNumber: true },
          })
        : null;
    const lastCheckIn = episode.checkInAssignments[0]?.outcome
      ? {
          id: episode.checkInAssignments[0].id,
          outcome: episode.checkInAssignments[0].outcome.type,
          recordedAt: episode.checkInAssignments[0].outcome.recordedAt,
        }
      : null;
    const openAlerts = boundCollection(episode.alerts);
    const openTasks = boundCollection(episode.tasks);
    const preview = buildDeterministicSbar({
      episode: {
        id: episode.id,
        isSynthetic: episode.patient.isSynthetic,
        patientPseudonymousId: episode.patient.externalPseudonymousId,
        status: episode.status,
        dischargeDate: episode.dischargeDate,
      },
      checkInProtocol: episode.checkInProtocolVersion,
      activeSafetyPlan,
      lastCheckIn,
      openAlerts: openAlerts.values,
      openTasks: openTasks.values,
      collectionCoverage: {
        openAlerts: openAlerts.coverage,
        openTasks: openTasks.coverage,
      },
      generatedBy: actor,
      generatedAt,
    });
    await transaction.auditEvent.create({
      data: {
        actorUserId: actor.id,
        actorRole,
        action: "SBAR_PREVIEW_GENERATED",
        resourceType: "DischargeEpisode",
        resourceId: episode.id,
        outcome: "SUCCESS",
        correlationId,
        createdAt: generatedAt,
      },
    });
    return preview;
  });
}
