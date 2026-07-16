import { describe, expect, it, vi } from "vitest";

import { errors } from "@/infrastructure/http/app-error";
import { logTechnicalError, serializeError } from "@/infrastructure/http/error-handler";

describe("sanitized error handling", () => {
  it("no expone stack, mensaje interno ni valores de entorno en producción", () => {
    const secretBearingError = new Error(
      "DATABASE_URL=postgresql://user:secret@hospital.invalid/clinical",
    );
    secretBearingError.stack = "STACK_WITH_SYNTHETIC_SENSITIVE_PAYLOAD";

    const serialized = serializeError(secretBearingError, "018f673a-4e35-7060-99b5-7bc6feba3a97");
    const output = JSON.stringify(serialized);

    expect(serialized.status).toBe(500);
    expect(output).not.toContain("secret");
    expect(output).not.toContain("DATABASE_URL");
    expect(output).not.toContain("STACK_WITH");
  });

  it("los logs técnicos usan una lista mínima y nunca el mensaje del error", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logTechnicalError(
      new Error("SYNTHETIC_CLINICAL_NOTE_SHOULD_NOT_APPEAR"),
      "018f673a-4e35-7060-99b5-7bc6feba3a97",
      "unit-test",
    );

    expect(consoleError).toHaveBeenCalledOnce();
    const logged = String(consoleError.mock.calls[0]?.[0]);
    expect(logged).toContain("INTERNAL_ERROR");
    expect(logged).not.toContain("SYNTHETIC_CLINICAL_NOTE");
  });

  it("conserva mensajes públicos tipados", () => {
    expect(serializeError(errors.forbidden(), "correlation-id")).toEqual({
      status: 403,
      body: {
        error: {
          code: "FORBIDDEN",
          message: "Acceso denegado.",
          correlationId: "correlation-id",
        },
      },
    });
  });
});
