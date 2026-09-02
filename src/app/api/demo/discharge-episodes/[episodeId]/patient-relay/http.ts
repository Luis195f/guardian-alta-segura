import type { NextRequest } from "next/server";

import {
  RelayConflictError,
  RelayDeniedError,
  RelayInvalidError,
} from "@/application/relay/manage-continuity-relay";
import { errors } from "@/infrastructure/http/app-error";

export async function requireEmptyJsonObject(request: NextRequest): Promise<void> {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 0) {
    throw errors.badRequest();
  }
}

export function mapPatientRelayError(error: unknown): never {
  if (error instanceof RelayInvalidError) throw errors.badRequest();
  if (error instanceof RelayConflictError) throw errors.conflict();
  if (error instanceof RelayDeniedError) {
    if (error.errorCode === "confirmation_invalid") throw errors.conflict();
    if (
      error.errorCode === "authority_unavailable" ||
      error.errorCode === "attestation_unavailable" ||
      error.errorCode === "task_contract_invalid" ||
      error.errorCode === "expiry_policy_invalid"
    ) {
      throw errors.unavailable();
    }
    throw errors.forbidden();
  }
  throw error;
}
