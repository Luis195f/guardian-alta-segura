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
  PATIENT_RELAY_TASK_CONTRACT,
  SYNTHETIC_PATIENT_RELAY_RESULT,
} from "@/domain/relay/patient-relay-contract";
import { readServerEnvironment } from "@/infrastructure/config/env";
import { KeyedCallFingerprint } from "@/infrastructure/call-transport/keyed-call-fingerprint";
import { assertServerOnlyRuntime } from "@/infrastructure/call-transport/server-only-guard";
import { prisma } from "@/infrastructure/persistence/prisma";
import { PrismaContinuityRelayStore } from "@/infrastructure/persistence/prisma-continuity-relay-store";
import { PrismaOutboundCallIntentStore } from "@/infrastructure/persistence/prisma-outbound-call-intent-store";
import { HmacRelaySecretProtector } from "@/infrastructure/relay/hmac-relay-secret-protector";

assertServerOnlyRuntime();

export const SYNTHETIC_PATIENT_RELAY_EPISODE = "synthetic-demo-episode-buildweek";
export const SYNTHETIC_PATIENT_RELAY_ATTESTATION = "synthetic-demo-attestation-v1";
export const SYNTHETIC_PATIENT_RELAY_TTL_MS = 5 * 60_000;
const SYNTHETIC_PATIENT_PSEUDONYM = "SYNTH-PATIENT-001";
const SYNTHETIC_PHONE = ["+", "34", "600", "000", "001"].join("");
const SYNTHETIC_MASK = "+34*******01";
const SYNTHETIC_FINGERPRINT_KEY = "synthetic-demo-only-call-fingerprint-key-v1";
const SYNTHETIC_RELAY_KEY = "synthetic-demo-only-relay-authority-key-v1";

function assertSyntheticDemoOnly(): void {
  const environment = readServerEnvironment();
  if (!environment.demoMode || environment.nodeEnv === "production") {
    throw new Error("Synthetic Patient Relay is unavailable outside the local demo");
  }
  if (process.env.CALL_E_REST_ENABLED === "true" || Boolean(process.env.CALL_E_API_KEY?.trim())) {
    throw new Error("Synthetic Patient Relay rejects live CALL-E configuration");
  }
}

class FixedRelayActorContext implements RelayActorContext {
  constructor(private readonly actor: AuthenticatedPrincipal) {}

  async current(): Promise<AuthenticatedPrincipal> {
    return this.actor;
  }
}

function actingRole(
  actor: AuthenticatedPrincipal,
  persistedActor: {
    readonly id: string;
    readonly isActive: boolean;
    readonly isSynthetic: boolean;
    readonly roleAssignments: readonly { readonly role: string }[];
  },
  episode: { readonly responsibleNurseId: string; readonly responsibleClinicianId: string },
): "nurse" | "clinician" | null {
  if (
    persistedActor.id !== actor.userId ||
    !persistedActor.isActive ||
    !persistedActor.isSynthetic
  ) {
    return null;
  }
  const activeRoles = persistedActor.roleAssignments.map(({ role }) => role);
  if (
    episode.responsibleNurseId === actor.userId &&
    actor.roles.includes("nurse") &&
    activeRoles.includes("nurse")
  ) {
    return "nurse";
  }
  if (
    episode.responsibleClinicianId === actor.userId &&
    actor.roles.includes("clinician") &&
    activeRoles.includes("clinician")
  ) {
    return "clinician";
  }
  return null;
}

export class SyntheticDemoPatientRelayAuthority implements RelayAuthorityResolver {
  async resolve(
    input: Parameters<RelayAuthorityResolver["resolve"]>[0],
  ): Promise<RelayAuthoritySnapshot | null> {
    assertSyntheticDemoOnly();
    if (
      input.recipientKind !== "PATIENT" ||
      input.purpose !== "PATIENT_CALLBACK_OFFER" ||
      input.context.episodeRef !== SYNTHETIC_PATIENT_RELAY_EPISODE ||
      input.context.taskRef !== null
    ) {
      return null;
    }
    const [persistedActor, episode] = await Promise.all([
      prisma.user.findUnique({
        where: { id: input.actor.userId },
        select: {
          id: true,
          isActive: true,
          isSynthetic: true,
          roleAssignments: {
            where: { role: { in: ["nurse", "clinician"] }, revokedAt: null },
            select: { role: true },
          },
        },
      }),
      prisma.dischargeEpisode.findUnique({
        where: { id: input.context.episodeRef },
        select: {
          id: true,
          version: true,
          status: true,
          responsibleNurseId: true,
          responsibleClinicianId: true,
          patient: {
            select: {
              id: true,
              externalPseudonymousId: true,
              isSynthetic: true,
              identityVerificationState: true,
              identityVerificationPolicyVersionId: true,
              identityVerifiedAt: true,
            },
          },
        },
      }),
    ]);
    if (
      !persistedActor ||
      !episode ||
      episode.status !== "ACTIVE" ||
      !episode.patient.isSynthetic ||
      episode.patient.externalPseudonymousId !== SYNTHETIC_PATIENT_PSEUDONYM ||
      episode.patient.identityVerificationState !== "VERIFIED" ||
      !episode.patient.identityVerificationPolicyVersionId ||
      !episode.patient.identityVerifiedAt
    ) {
      return null;
    }
    const role = actingRole(input.actor, persistedActor, episode);
    if (!role) return null;
    return {
      actingRole: role,
      episodeRef: episode.id,
      taskRef: null,
      targetRef: episode.patient.id,
      destinationPhone: SYNTHETIC_PHONE,
      maskedTarget: SYNTHETIC_MASK,
      region: "ES",
      locale: "es-ES",
      lineRegion: "SYNTHETIC_LOCAL_NO_PROVIDER",
      revision: `episode-v${episode.version}`,
      professionalEligibility: null,
    };
  }

  async authorizeReview(
    input: Parameters<RelayAuthorityResolver["authorizeReview"]>[0],
  ): Promise<"nurse" | "clinician" | null> {
    assertSyntheticDemoOnly();
    if (
      input.attempt.recipientKind !== "PATIENT" ||
      input.attempt.purpose !== "PATIENT_CALLBACK_OFFER" ||
      input.attempt.episodeRef !== SYNTHETIC_PATIENT_RELAY_EPISODE ||
      input.attempt.taskRef !== null
    ) {
      return null;
    }
    const [persistedActor, episode] = await Promise.all([
      prisma.user.findUnique({
        where: { id: input.actor.userId },
        select: {
          id: true,
          isActive: true,
          isSynthetic: true,
          roleAssignments: {
            where: { role: { in: ["nurse", "clinician"] }, revokedAt: null },
            select: { role: true },
          },
        },
      }),
      prisma.dischargeEpisode.findUnique({
        where: { id: input.attempt.episodeRef },
        select: {
          status: true,
          responsibleNurseId: true,
          responsibleClinicianId: true,
          patient: {
            select: {
              id: true,
              isSynthetic: true,
              identityVerificationState: true,
              identityVerifiedAt: true,
            },
          },
        },
      }),
    ]);
    if (
      !persistedActor ||
      !episode ||
      episode.status !== "ACTIVE" ||
      !episode.patient.isSynthetic ||
      episode.patient.identityVerificationState !== "VERIFIED" ||
      !episode.patient.identityVerifiedAt ||
      episode.patient.id !== input.attempt.targetRef
    ) {
      return null;
    }
    return actingRole(input.actor, persistedActor, episode);
  }
}

export class SyntheticDemoPatientRelayAttestation implements RelayAttestationVerifier {
  async verify(
    input: Parameters<RelayAttestationVerifier["verify"]>[0],
  ): Promise<{ readonly version: string; readonly current: boolean }> {
    assertSyntheticDemoOnly();
    const current =
      input.recipientKind === "PATIENT" &&
      input.purpose === "PATIENT_CALLBACK_OFFER" &&
      input.actor.roles.some((role) => role === "nurse" || role === "clinician");
    return { version: SYNTHETIC_PATIENT_RELAY_ATTESTATION, current };
  }
}

export const SYNTHETIC_PATIENT_RELAY_POLICY: RelayPreviewPolicy = {
  expiresAt: ({ issuedAt }) => new Date(issuedAt.getTime() + SYNTHETIC_PATIENT_RELAY_TTL_MS),
  taskContract: ({ purpose }) => ({
    key: purpose,
    version: PATIENT_RELAY_TASK_CONTRACT.version,
    outboundTaskKey: "SYNTHETIC_CONTINUITY_CHECK",
  }),
};

class LocalSyntheticPatientRelayProvider implements OutboundCallProvider {
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
      throw new Error("Synthetic Patient Relay input is outside the demo allowlist");
    }
    return this.snapshot(
      `synthetic_${createHash("sha256").update(input.idempotencyRef).digest("hex").slice(0, 32)}`,
    );
  }

  async get(providerRef: string): Promise<OutboundCallSnapshot> {
    assertSyntheticDemoOnly();
    if (!/^synthetic_[0-9a-f]{32}$/.test(providerRef)) {
      throw new Error("Synthetic Patient Relay reference is invalid");
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

export class LocalSyntheticPatientRelayExecutor implements RelayOutboundExecutor {
  private readonly executeOutbound = new ExecuteOutboundCall(
    new LocalSyntheticPatientRelayProvider(),
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
      rawTechnicalResult: SYNTHETIC_PATIENT_RELAY_RESULT,
      syntheticExecution: true,
    };
  }
}

export function createSyntheticDemoPatientRelayService(
  actor: AuthenticatedPrincipal,
): ContinuityRelayService {
  assertSyntheticDemoOnly();
  return new ContinuityRelayService(
    new FixedRelayActorContext(actor),
    new SyntheticDemoPatientRelayAuthority(),
    new SyntheticDemoPatientRelayAttestation(),
    SYNTHETIC_PATIENT_RELAY_POLICY,
    new HmacRelaySecretProtector(SYNTHETIC_RELAY_KEY),
    new PrismaContinuityRelayStore(),
    new LocalSyntheticPatientRelayExecutor(),
  );
}

export async function getLatestSyntheticPatientRelayAttempt(
  episodeRef: string,
): Promise<RelayAttemptRecord | null> {
  assertSyntheticDemoOnly();
  const attempt = await prisma.relayAttempt.findFirst({
    where: {
      episodeRef,
      recipientKind: "PATIENT",
      purpose: "PATIENT_CALLBACK_OFFER",
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { confirmationDigest: true },
  });
  if (!attempt) return null;
  return new PrismaContinuityRelayStore().findByConfirmationDigest(attempt.confirmationDigest);
}
