import { NextRequest, NextResponse } from "next/server";

import { emptyPatientRelayView, patientRelayView } from "@/application/relay/patient-relay-view";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { requireDemoEpisodePrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import { PATIENT_RELAY_CONFIRMATION_COOKIE } from "@/infrastructure/http/patient-relay-confirmation-cookie";
import {
  getLatestSyntheticPatientRelayAttempt,
  SyntheticDemoPatientRelayAuthority,
} from "@/infrastructure/relay/synthetic-demo-patient-relay";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ episodeId: string }> },
): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal } = await requireDemoEpisodePrincipal(request, "read");
    const { episodeId } = await context.params;
    const authority = await new SyntheticDemoPatientRelayAuthority().resolve({
      actor: principal,
      recipientKind: "PATIENT",
      purpose: "PATIENT_CALLBACK_OFFER",
      context: { episodeRef: episodeId, taskRef: null },
    });
    if (!authority) return NextResponse.json(emptyPatientRelayView(), { status: 404 });
    const attempt = await getLatestSyntheticPatientRelayAttempt(episodeId);
    const relay = attempt
      ? patientRelayView(
          attempt,
          authority,
          Boolean(request.cookies.get(PATIENT_RELAY_CONFIRMATION_COOKIE)?.value),
        )
      : emptyPatientRelayView();
    return NextResponse.json(relay, {
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
  } catch (error) {
    return errorResponse(error, correlationId, "demo-patient-relay-read");
  }
}
