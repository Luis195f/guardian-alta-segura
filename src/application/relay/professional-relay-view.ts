import type {
  RelayAttemptRecord,
  RelayAuthoritySnapshot,
} from "@/application/ports/continuity-relay";
import { RELAY_COST_NOTICE, RELAY_NO_CANCEL_NOTICE } from "@/domain/relay/continuity-relay";
import {
  PROFESSIONAL_RELAY_RESULT_SCHEMA,
  PROFESSIONAL_RELAY_TASK_CONTRACT,
} from "@/domain/relay/professional-relay-contract";

export function emptyProfessionalRelayView() {
  return {
    phase: "empty" as const,
    title: "Professional Relay",
    message: "No hay un Professional Relay iniciado para este episodio.",
  };
}

export function professionalRelayView(
  attempt: RelayAttemptRecord,
  authority: RelayAuthoritySnapshot,
  confirmationAvailable: boolean,
  now: Date = new Date(),
) {
  const expired = attempt.lifecycleState === "PREVIEWED" && attempt.expiresAt <= now;
  const reviewPending = attempt.lifecycleState.startsWith("RESULT_");
  const technicalResult =
    attempt.technicalResult && "acknowledged" in attempt.technicalResult
      ? attempt.technicalResult
      : null;
  return {
    phase: expired
      ? ("expired" as const)
      : attempt.lifecycleState === "PREVIEWED"
        ? ("preview" as const)
        : attempt.lifecycleState === "HUMAN_REVIEWED"
          ? ("reviewed" as const)
          : reviewPending
            ? ("review_pending" as const)
            : ("technical_pending" as const),
    title: PROFESSIONAL_RELAY_TASK_CONTRACT.title,
    purpose: PROFESSIONAL_RELAY_TASK_CONTRACT.purpose,
    recipientKind: "PROFESSIONAL" as const,
    purposeKey: "PROFESSIONAL_REVIEW_REQUEST" as const,
    maskedRecipient: authority.maskedTarget,
    opaqueTaskRef: authority.taskRef,
    region: authority.region,
    locale: authority.locale,
    lineRegion: authority.lineRegion,
    authorityRevision: authority.revision,
    taskContract: PROFESSIONAL_RELAY_TASK_CONTRACT,
    resultSchema: PROFESSIONAL_RELAY_RESULT_SCHEMA,
    notices: {
      cost: RELAY_COST_NOTICE,
      noCancellation: RELAY_NO_CANCEL_NOTICE,
      syntheticFixture:
        "Todos los valores mostrados proceden de un fixture sintético predeterminado de la aplicación.",
      noObservedInteraction:
        "No demuestran conversación, verificación verbal, divulgación, respuesta del agente ni comportamiento real del proveedor.",
      humanReview:
        "El resultado permanece pendiente hasta una revisión humana explícita; HUMAN_REVIEWED no significa aprobación clínica.",
      taskSemantics:
        "acknowledged=yes no significa Task accepted; availability_to_review=yes no crea assignment; taskCompleted técnico no resuelve la GAS Task.",
    },
    attestation: {
      version: attempt.attestationVersion,
      current: true as const,
      scope: "SINTÉTICO / NO PRODUCTIVO" as const,
    },
    expiresAt: attempt.expiresAt.toISOString(),
    oneUseConfirmation: true as const,
    confirmationAvailable:
      attempt.lifecycleState === "PREVIEWED" && confirmationAvailable && !expired,
    lifecycleState: attempt.lifecycleState,
    resultValidity: attempt.resultValidity,
    technicalResult,
    reviewedAt: attempt.reviewedAt?.toISOString() ?? null,
    providerContacted: false as const,
    executionMode: "LOCAL_SYNTHETIC_NO_NETWORK" as const,
  };
}
