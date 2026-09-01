export type RelayRecipientKind = "PATIENT" | "PROFESSIONAL";

export type RelayPurpose = "PATIENT_CALLBACK_OFFER" | "PROFESSIONAL_REVIEW_REQUEST";

export type RelayLifecycleState =
  | "PREVIEWED"
  | "CONFIRMED"
  | "PROVIDER_CREATED"
  | "RESULT_COMPLETED"
  | "RESULT_FAILED"
  | "RESULT_CANCELED"
  | "RESULT_UNCERTAIN"
  | "HUMAN_REVIEWED";

export type RelayTechnicalDisposition = "COMPLETED" | "FAILED" | "CANCELED" | "UNCERTAIN";

export const RELAY_COST_NOTICE =
  "La ejecución puede consumir crédito y generar coste; este preview no consulta ni afirma saldo o precio actual.";

export const RELAY_NO_CANCEL_NOTICE =
  "La llamada no dispone de cancelación mediante la API Calls; detener la espera no cancela una llamada aceptada.";

export function isValidRelayPair(
  recipientKind: RelayRecipientKind,
  purpose: RelayPurpose,
): boolean {
  return (
    (recipientKind === "PATIENT" && purpose === "PATIENT_CALLBACK_OFFER") ||
    (recipientKind === "PROFESSIONAL" && purpose === "PROFESSIONAL_REVIEW_REQUEST")
  );
}

export function isRelayResultState(
  state: RelayLifecycleState,
): state is `RESULT_${RelayTechnicalDisposition}` {
  return state.startsWith("RESULT_");
}

export function technicalDispositionForRelayState(
  state: RelayLifecycleState,
): RelayTechnicalDisposition | null {
  return isRelayResultState(state)
    ? (state.slice("RESULT_".length) as RelayTechnicalDisposition)
    : null;
}

export function relayResultState(
  disposition: RelayTechnicalDisposition,
): `RESULT_${RelayTechnicalDisposition}` {
  return `RESULT_${disposition}`;
}

export function isValidRelayTransition(
  fromState: RelayLifecycleState | null,
  toState: RelayLifecycleState,
): boolean {
  if (fromState === null) return toState === "PREVIEWED";
  if (fromState === "PREVIEWED") return toState === "CONFIRMED";
  if (fromState === "CONFIRMED") return toState === "PROVIDER_CREATED";
  if (fromState === "PROVIDER_CREATED") return isRelayResultState(toState);
  if (isRelayResultState(fromState)) return toState === "HUMAN_REVIEWED";
  return false;
}
