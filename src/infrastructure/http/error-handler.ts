import { NextResponse } from "next/server";

import { AppError } from "@/infrastructure/http/app-error";

interface PublicErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly correlationId: string;
  };
}

export function serializeError(
  error: unknown,
  correlationId: string,
): {
  readonly status: number;
  readonly body: PublicErrorBody;
} {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: { error: { code: error.code, message: error.publicMessage, correlationId } },
    };
  }
  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "Se ha producido un error técnico.",
        correlationId,
      },
    },
  };
}

export function logTechnicalError(error: unknown, correlationId: string, component: string): void {
  const code = error instanceof AppError ? error.code : "INTERNAL_ERROR";
  console.error(JSON.stringify({ level: "error", code, correlationId, component }));
}

export function errorResponse(
  error: unknown,
  correlationId: string,
  component: string,
): NextResponse {
  logTechnicalError(error, correlationId, component);
  const serialized = serializeError(error, correlationId);
  return NextResponse.json(serialized.body, {
    status: serialized.status,
    headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
  });
}
