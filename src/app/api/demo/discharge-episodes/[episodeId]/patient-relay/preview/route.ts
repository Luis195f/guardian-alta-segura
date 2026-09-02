import { NextRequest, NextResponse } from "next/server";

import { patientRelayView } from "@/application/relay/patient-relay-view";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { requireDemoEpisodePrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import { patientRelayConfirmationCookie } from "@/infrastructure/http/patient-relay-confirmation-cookie";
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
  try {
    const { principal, applicationOrigin } = await requireDemoEpisodePrincipal(request, "write");
    assertSameOrigin(request, applicationOrigin);
    await requireEmptyJsonObject(request);
    const { episodeId } = await context.params;
    const service = createSyntheticDemoPatientRelayService(principal);
    let preview;
    try {
      preview = await service.preview({
        recipientKind: "PATIENT",
        purpose: "PATIENT_CALLBACK_OFFER",
        episodeRef: episodeId,
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
    if (!attempt || !authority) throw new Error("Synthetic preview state unavailable");
    const response = NextResponse.json(patientRelayView(attempt, authority, true), {
      status: 201,
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
    response.cookies.set(
      patientRelayConfirmationCookie(
        episodeId,
        preview.confirmationToken,
        preview.expiresAt,
        request.nextUrl.protocol === "https:",
      ),
    );
    return response;
  } catch (error) {
    return errorResponse(error, correlationId, "demo-patient-relay-preview");
  }
}
