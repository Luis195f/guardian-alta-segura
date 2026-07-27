import { NextRequest, NextResponse } from "next/server";

import {
  GetEpisodeGovernanceEvidenceService,
  GovernanceEvidenceConcurrentChangeError,
  GovernanceEvidenceDeniedError,
  GovernanceEvidenceInvalidError,
  GovernanceEvidenceNotFoundError,
} from "@/application/governance/get-governance-evidence";
import { PendingInstitutionalEpisodeGovernancePolicy } from "@/domain/episode/activation-policy";
import { errors } from "@/infrastructure/http/app-error";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { requireDemoEpisodePrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import { PrismaGovernanceEvidenceReader } from "@/infrastructure/persistence/prisma-governance-evidence-reader";

export const dynamic = "force-dynamic";

const governancePolicy = new PendingInstitutionalEpisodeGovernancePolicy();

function mapEvidenceError(error: unknown): never {
  if (error instanceof GovernanceEvidenceDeniedError) throw errors.forbidden();
  if (error instanceof GovernanceEvidenceNotFoundError) throw errors.notFound();
  if (error instanceof GovernanceEvidenceInvalidError) throw errors.badRequest();
  if (error instanceof GovernanceEvidenceConcurrentChangeError) throw errors.conflict();
  throw error;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ episodeId: string }> },
): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal } = await requireDemoEpisodePrincipal(request, "read");
    const { episodeId } = await context.params;
    let evidence;
    try {
      evidence = await new GetEpisodeGovernanceEvidenceService(
        new PrismaGovernanceEvidenceReader(governancePolicy),
      ).execute({ actor: principal, episodeId, correlationId });
    } catch (error) {
      mapEvidenceError(error);
    }
    return NextResponse.json(
      {
        notice: "SINTÉTICO / NO USO CLÍNICO",
        limitation:
          "Evidencia técnica de gobernanza; no certifica seguridad clínica, cumplimiento jurídico ni conformidad regulatoria.",
        evidence,
      },
      { headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } },
    );
  } catch (error) {
    return errorResponse(error, correlationId, "demo-governance-evidence-read");
  }
}
