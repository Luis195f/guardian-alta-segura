import { NextRequest, NextResponse } from "next/server";

import { patientRelayView } from "@/application/relay/patient-relay-view";
import { errors } from "@/infrastructure/http/app-error";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { requireDemoEpisodePrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import {
  expiredPatientRelayConfirmationCookie,
  PATIENT_RELAY_CONFIRMATION_COOKIE,
} from "@/infrastructure/http/patient-relay-confirmation-cookie";
import {
  createSyntheticDemoPatientRelayService,
  getLatestSyntheticPatientRelayAttempt,
  SyntheticDemoPatientRelayAuthority,
} from "@/infrastructure/relay/synthetic-demo-patient-relay";
import { mapPatientRelayError, requireEmptyJsonObject } from "../http";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ episodeId: string }> },
): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  const secure = request.nextUrl.protocol === "https:";
  const { episodeId } = await context.params;
  try {
    const { principal, applicationOrigin } = await requireDemoEpisodePrincipal(request, "write");
    assertSameOrigin(request, applicationOrigin);
    await requireEmptyJsonObject(request);
    const confirmationToken = request.cookies.get(PATIENT_RELAY_CONFIRMATION_COOKIE)?.value;
    if (!confirmationToken) throw errors.conflict();
    try {
      await createSyntheticDemoPatientRelayService(principal).confirm({
        recipientKind: "PATIENT",
        purpose: "PATIENT_CALLBACK_OFFER",
        episodeRef: episodeId,
        confirmationToken,
        correlationId,
      });
    } catch (error) {
      mapPatientRelayError(error);
    }
    const [attempt, authority] = await Promise.all([
      getLatestSyntheticPatientRelayAttempt(episodeId),
      new SyntheticDemoPatientRelayAuthority().resolve({
        actor: principal,
        recipientKind: "PATIENT",
        purpose: "PATIENT_CALLBACK_OFFER",
        context: { episodeRef: episodeId, taskRef: null },
      }),
    ]);
    if (!attempt || !authority) throw new Error("Synthetic result state unavailable");
    const response = NextResponse.json(patientRelayView(attempt, authority, false), {
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
    response.cookies.set(expiredPatientRelayConfirmationCookie(episodeId, secure));
    return response;
  } catch (error) {
    const response = errorResponse(error, correlationId, "demo-patient-relay-confirm");
    response.cookies.set(expiredPatientRelayConfirmationCookie(episodeId, secure));
    return response;
  }
}
