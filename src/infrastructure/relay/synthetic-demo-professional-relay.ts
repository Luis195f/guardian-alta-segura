import { createHash } from "node:crypto";

import { ExecuteOutboundCall } from "@/application/outbound-call/execute-outbound-call";
import type {
  RelayActorContext,
  RelayAttemptRecord,
  RelayAttestationVerifier,
  RelayAuthorityResolver,
  RelayAuthoritySnapshot,
  RelayOutboundExecutor,
  RelayPreviewPolicy,
} from "@/application/ports/continuity-relay";
import type {
  CreateOutboundCallInput,
  OutboundCallProvider,
  OutboundCallSnapshot,
} from "@/application/ports/outbound-call";
import { ContinuityRelayService } from "@/application/relay/manage-continuity-relay";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import {
  PROFESSIONAL_RELAY_TASK_CONTRACT,
  SYNTHETIC_PROFESSIONAL_RELAY_RESULT,
} from "@/domain/relay/professional-relay-contract";
import { KeyedCallFingerprint } from "@/infrastructure/call-transport/keyed-call-fingerprint";
import { assertServerOnlyRuntime } from "@/infrastructure/call-transport/server-only-guard";
import { readServerEnvironment } from "@/infrastructure/config/env";
import { prisma } from "@/infrastructure/persistence/prisma";
import { PrismaContinuityRelayStore } from "@/infrastructure/persistence/prisma-continuity-relay-store";
import { PrismaOutboundCallIntentStore } from "@/infrastructure/persistence/prisma-outbound-call-intent-store";
import { HmacRelaySecretProtector } from "@/infrastructure/relay/hmac-relay-secret-protector";

assertServerOnlyRuntime();

export const SYNTHETIC_PROFESSIONAL_RELAY_EPISODE = "synthetic-demo-episode-buildweek";
export const SYNTHETIC_PROFESSIONAL_RELAY_TASK = "synthetic-demo-professional-review-task";
export const SYNTHETIC_PROFESSIONAL_RELAY_ATTESTATION =
  "synthetic-demo-professional-attestation-v1";
export const SYNTHETIC_PROFESSIONAL_RELAY_TTL_MS = 5 * 60_000;
const SYNTHETIC_PHONE = ["+", "34", "600", "000", "002"].join("");
const SYNTHETIC_MASK = "+34*******02";
const SYNTHETIC_FINGERPRINT_KEY = "synthetic-demo-only-professional-call-fingerprint-key-v1";
const SYNTHETIC_RELAY_KEY = "synthetic-demo-only-professional-relay-authority-key-v1";

function assertSyntheticDemoOnly(): void {
  const environment = readServerEnvironment();
  if (!environment.demoMode || environment.nodeEnv === "production") {
    throw new Error("Synthetic Professional Relay is unavailable outside the local demo");
  }
  if (process.env.CALL_E_REST_ENABLED === "true" || Boolean(process.env.CALL_E_API_KEY?.trim())) {
    throw new Error("Synthetic Professional Relay rejects live CALL-E configuration");
  }
}

class FixedRelayActorContext implements RelayActorContext {
  constructor(private readonly actor: AuthenticatedPrincipal) {}

  async current(): Promise<AuthenticatedPrincipal> {
    return this.actor;
  }
}

function authorityRevision(input: {
  readonly episodeRevision: number;
  readonly taskRevision: number;
  readonly actorRoleAssignmentRef: string;
  readonly targetRoleAssignmentRef: string;
}): string {
  return `professional-${createHash("sha256")
    .update(
      JSON.stringify([
        input.episodeRevision,
        input.taskRevision,
        input.actorRoleAssignmentRef,
        input.targetRoleAssignmentRef,
      ]),
    )
    .digest("hex")
    .slice(0, 48)}`;
}

export class SyntheticDemoProfessionalRelayAuthority implements RelayAuthorityResolver {
  async resolve(
    input: Parameters<RelayAuthorityResolver["resolve"]>[0],
  ): Promise<RelayAuthoritySnapshot | null> {
    assertSyntheticDemoOnly();
    if (
      input.recipientKind !== "PROFESSIONAL" ||
      input.purpose !== "PROFESSIONAL_REVIEW_REQUEST" ||
      input.context.episodeRef !== SYNTHETIC_PROFESSIONAL_RELAY_EPISODE ||
      (input.context.taskRef !== null &&
        input.context.taskRef !== SYNTHETIC_PROFESSIONAL_RELAY_TASK)
    ) {
      return null;
    }

    const [actor, task] = await Promise.all([
      prisma.user.findUnique({
        where: { id: input.actor.userId },
        select: {
          id: true,
          isSynthetic: true,
          isActive: true,
          roleAssignments: {
            where: { role: "nurse", revokedAt: null },
            select: { id: true },
          },
        },
      }),
      prisma.task.findUnique({
        where: { id: SYNTHETIC_PROFESSIONAL_RELAY_TASK },
        select: {
          id: true,
          episodeId: true,
          currentState: true,
          revision: true,
          assignedToId: true,
          resolvedAt: true,
          episode: {
            select: {
              id: true,
              version: true,
              status: true,
              responsibleNurseId: true,
              responsibleClinicianId: true,
              patient: { select: { isSynthetic: true } },
            },
          },
          assignedTo: {
            select: {
              id: true,
              isSynthetic: true,
              isActive: true,
              roleAssignments: {
                where: { role: "clinician", revokedAt: null },
                select: { id: true },
              },
            },
          },
        },
      }),
    ]);
    const actorRoleAssignment = actor?.roleAssignments[0];
    const targetRoleAssignment = task?.assignedTo?.roleAssignments[0];
    if (
      !actor ||
      !actor.isSynthetic ||
      !actor.isActive ||
      actor.roleAssignments.length !== 1 ||
      !actorRoleAssignment ||
      !input.actor.roles.includes("nurse") ||
      !task ||
      task.episodeId !== input.context.episodeRef ||
      task.currentState !== "OPEN" ||
      task.resolvedAt !== null ||
      !task.assignedToId ||
      !task.assignedTo ||
      !task.assignedTo.isSynthetic ||
      !task.assignedTo.isActive ||
      task.assignedTo.roleAssignments.length !== 1 ||
      !targetRoleAssignment ||
      task.episode.status !== "ACTIVE" ||
      !task.episode.patient.isSynthetic ||
      task.episode.responsibleNurseId !== actor.id ||
      task.episode.responsibleClinicianId !== task.assignedTo.id ||
      task.assignedTo.id === actor.id
    ) {
      return null;
    }

    const professionalEligibility = {
      episodeRevision: task.episode.version,
      taskRevision: task.revision,
      actorRoleAssignmentRef: actorRoleAssignment.id,
      targetRoleAssignmentRef: targetRoleAssignment.id,
      targetRole: "clinician" as const,
    };
    return {
      actingRole: "nurse",
      episodeRef: task.episode.id,
      taskRef: task.id,
      targetRef: task.assignedTo.id,
      destinationPhone: SYNTHETIC_PHONE,
      maskedTarget: SYNTHETIC_MASK,
      region: "ES",
      locale: "es-ES",
      lineRegion: "SYNTHETIC_LOCAL_NO_PROVIDER",
      revision: authorityRevision(professionalEligibility),
      professionalEligibility,
    };
  }

  async authorizeReview(
    input: Parameters<RelayAuthorityResolver["authorizeReview"]>[0],
  ): Promise<"nurse" | null> {
    assertSyntheticDemoOnly();
    if (
      input.attempt.recipientKind !== "PROFESSIONAL" ||
      input.attempt.purpose !== "PROFESSIONAL_REVIEW_REQUEST" ||
      input.attempt.episodeRef !== SYNTHETIC_PROFESSIONAL_RELAY_EPISODE ||
      input.attempt.taskRef !== SYNTHETIC_PROFESSIONAL_RELAY_TASK ||
      input.attempt.actorRef !== input.actor.userId
    ) {
      return null;
    }
    const current = await this.resolve({
      actor: input.actor,
      recipientKind: "PROFESSIONAL",
      purpose: "PROFESSIONAL_REVIEW_REQUEST",
      context: { episodeRef: input.attempt.episodeRef, taskRef: input.attempt.taskRef },
    });
    return current &&
      current.targetRef === input.attempt.targetRef &&
      current.revision === input.attempt.revision
      ? "nurse"
      : null;
  }
}

export class SyntheticDemoProfessionalRelayAttestation implements RelayAttestationVerifier {
  async verify(
    input: Parameters<RelayAttestationVerifier["verify"]>[0],
  ): Promise<{ readonly version: string; readonly current: boolean }> {
    assertSyntheticDemoOnly();
    return {
      version: SYNTHETIC_PROFESSIONAL_RELAY_ATTESTATION,
      current:
        input.recipientKind === "PROFESSIONAL" &&
        input.purpose === "PROFESSIONAL_REVIEW_REQUEST" &&
        input.actor.roles.includes("nurse"),
    };
  }
}

export const SYNTHETIC_PROFESSIONAL_RELAY_POLICY: RelayPreviewPolicy = {
  expiresAt: ({ issuedAt }) => new Date(issuedAt.getTime() + SYNTHETIC_PROFESSIONAL_RELAY_TTL_MS),
  taskContract: ({ purpose }) => ({
    key: purpose,
    version: PROFESSIONAL_RELAY_TASK_CONTRACT.version,
    outboundTaskKey: "SYNTHETIC_CONTINUITY_CHECK",
  }),
};

class LocalSyntheticProfessionalRelayProvider implements OutboundCallProvider {
  async create(input: CreateOutboundCallInput): Promise<OutboundCallSnapshot> {
    assertSyntheticDemoOnly();
    const recipient = input.recipients[0];
    if (
      input.taskKey !== "SYNTHETIC_CONTINUITY_CHECK" ||
      input.recipients.length !== 1 ||
      recipient?.phones.length !== 1 ||
      recipient.phones[0] !== SYNTHETIC_PHONE ||
      recipient.region !== "ES" ||
      recipient.locale !== "es-ES"
    ) {
      throw new Error("Synthetic Professional Relay input is outside the demo allowlist");
    }
    return this.snapshot(
      `synthetic_professional_${createHash("sha256")
        .update(input.idempotencyRef)
        .digest("hex")
        .slice(0, 32)}`,
    );
  }

  async get(providerRef: string): Promise<OutboundCallSnapshot> {
    assertSyntheticDemoOnly();
    if (!/^synthetic_professional_[0-9a-f]{32}$/.test(providerRef)) {
      throw new Error("Synthetic Professional Relay reference is invalid");
    }
    return this.snapshot(providerRef);
  }

  private snapshot(providerRef: string): OutboundCallSnapshot {
    const now = new Date();
    return {
      providerRef,
      status: "COMPLETED",
      structuredResult: "ABSTAINED",
      providerCreatedAt: now,
      providerCompletedAt: now,
    };
  }
}

export class LocalSyntheticProfessionalRelayExecutor implements RelayOutboundExecutor {
  private readonly executeOutbound = new ExecuteOutboundCall(
    new LocalSyntheticProfessionalRelayProvider(),
    new PrismaOutboundCallIntentStore(),
    new KeyedCallFingerprint(SYNTHETIC_FINGERPRINT_KEY),
    { pollingTimeoutMs: 1_000, pollingIntervalMs: 1 },
  );

  async execute(
    input: Parameters<RelayOutboundExecutor["execute"]>[0],
  ): ReturnType<RelayOutboundExecutor["execute"]> {
    assertSyntheticDemoOnly();
    const outboundIntent = await this.executeOutbound.execute(input);
    return {
      outboundIntent,
      rawTechnicalResult: SYNTHETIC_PROFESSIONAL_RELAY_RESULT,
      syntheticExecution: true,
    };
  }
}

export function createSyntheticDemoProfessionalRelayService(
  actor: AuthenticatedPrincipal,
): ContinuityRelayService {
  assertSyntheticDemoOnly();
  return new ContinuityRelayService(
    new FixedRelayActorContext(actor),
    new SyntheticDemoProfessionalRelayAuthority(),
    new SyntheticDemoProfessionalRelayAttestation(),
    SYNTHETIC_PROFESSIONAL_RELAY_POLICY,
    new HmacRelaySecretProtector(SYNTHETIC_RELAY_KEY),
    new PrismaContinuityRelayStore(),
    new LocalSyntheticProfessionalRelayExecutor(),
  );
}

export async function getLatestSyntheticProfessionalRelayAttempt(
  episodeRef: string,
): Promise<RelayAttemptRecord | null> {
  assertSyntheticDemoOnly();
  const attempt = await prisma.relayAttempt.findFirst({
    where: {
      episodeRef,
      recipientKind: "PROFESSIONAL",
      purpose: "PROFESSIONAL_REVIEW_REQUEST",
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { confirmationDigest: true },
  });
  if (!attempt) return null;
  return new PrismaContinuityRelayStore().findByConfirmationDigest(attempt.confirmationDigest);
}
