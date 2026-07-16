import { NextResponse } from "next/server";

import { getCorrelationId } from "@/infrastructure/http/correlation-id";

export const dynamic = "force-dynamic";

export function GET(request: Request): NextResponse {
  const correlationId = getCorrelationId(request);
  return NextResponse.json(
    { status: "ok", service: "guardian-alta-segura" },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "X-Correlation-ID": correlationId,
      },
    },
  );
}
