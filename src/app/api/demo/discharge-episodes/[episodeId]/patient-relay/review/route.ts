import { NextRequest, NextResponse } from "next/server";

import { patientRelayView } from "@/application/relay/patient-relay-view";
import { errors } from "@/infrastructure/http/app-error";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { requireDemoEpisodePrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
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
    const attempt = await getLatestSyntheticPatientRelayAttempt(episodeId);
    if (!attempt) throw errors.conflict();
    try {
      await createSyntheticDemoPatientRelayService(principal).recordHumanReview({
        attemptRef: attempt.id,
        correlationId,
      });
    } catch (error) {
      mapPatientRelayError(error);
    }
    const [reviewed, authority] = await Promise.all([
      getLatestSyntheticPatientRelayAttempt(episodeId),
      new SyntheticDemoPatientRelayAuthority().resolve({
        actor: principal,
        recipientKind: "PATIENT",
        purpose: "PATIENT_CALLBACK_OFFER",
        context: { episodeRef: episodeId, taskRef: null },
      }),
    ]);
    if (!reviewed || !authority) throw new Error("Synthetic review state unavailable");
    return NextResponse.json(patientRelayView(reviewed, authority, false), {
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
  } catch (error) {
    return errorResponse(error, correlationId, "demo-patient-relay-review");
  }
}
