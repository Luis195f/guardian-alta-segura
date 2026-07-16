export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
    readonly publicMessage: string,
  ) {
    super(code);
    this.name = "AppError";
  }
}

export const errors = {
  badRequest: () => new AppError("BAD_REQUEST", 400, "La solicitud no es válida."),
  unauthenticated: () => new AppError("UNAUTHENTICATED", 401, "Autenticación requerida."),
  forbidden: () => new AppError("FORBIDDEN", 403, "Acceso denegado."),
  notFound: () => new AppError("NOT_FOUND", 404, "Recurso no encontrado."),
  conflict: () =>
    new AppError("CONFLICT", 409, "La operación entra en conflicto con el estado actual."),
  rateLimited: () => new AppError("RATE_LIMITED", 429, "Demasiados intentos. Inténtalo más tarde."),
};
