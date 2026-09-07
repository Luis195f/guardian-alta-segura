import type {
  RelayAttemptRecord,
  RelayAuthoritySnapshot,
} from "@/application/ports/continuity-relay";
import {
  PATIENT_RELAY_RESULT_SCHEMA,
  PATIENT_RELAY_TASK_CONTRACT,
} from "@/domain/relay/patient-relay-contract";
import { RELAY_COST_NOTICE, RELAY_NO_CANCEL_NOTICE } from "@/domain/relay/continuity-relay";

export function emptyPatientRelayView() {
  return {
    phase: "empty" as const,
    title: "Patient Relay",
    message: "No hay un Patient Relay iniciado para este episodio.",
  };
}

export function patientRelayView(
  attempt: RelayAttemptRecord,
  authority: RelayAuthoritySnapshot,
  confirmationAvailable: boolean,
  now: Date = new Date(),
) {
  const expired = attempt.lifecycleState === "PREVIEWED" && attempt.expiresAt <= now;
  const reviewPending = attempt.lifecycleState.startsWith("RESULT_");
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
    title: PATIENT_RELAY_TASK_CONTRACT.title,
    purpose: PATIENT_RELAY_TASK_CONTRACT.purpose,
    recipientKind: "PATIENT" as const,
    purposeKey: "PATIENT_CALLBACK_OFFER" as const,
    maskedRecipient: authority.maskedTarget,
    region: authority.region,
    locale: authority.locale,
    lineRegion: authority.lineRegion,
    authorityRevision: authority.revision,
    taskContract: PATIENT_RELAY_TASK_CONTRACT,
    resultSchema: PATIENT_RELAY_RESULT_SCHEMA,
    notices: {
      cost: RELAY_COST_NOTICE,
      noCancellation: RELAY_NO_CANCEL_NOTICE,
      noClinicalAssessment:
        "No realiza evaluación clínica, diagnóstico, scoring, triaje, tratamiento ni consejo sobre medicación.",
      humanReview:
        "El resultado es técnico y requiere revisión humana; revisado no significa aprobación clínica ni resolución de una Task.",
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
    governanceOutcome: attempt.governanceOutcome,
    resultValidity: attempt.resultValidity,
    technicalResult: attempt.technicalResult,
    reviewedAt: attempt.reviewedAt?.toISOString() ?? null,
    providerContacted: false as const,
    executionMode: "LOCAL_SYNTHETIC_NO_NETWORK" as const,
  };
}
