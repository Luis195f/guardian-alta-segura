import { errors } from "@/infrastructure/http/app-error";

export function assertSameOrigin(request: Request, applicationOrigin: string): void {
  const origin = request.headers.get("origin");
  if (!origin) throw errors.forbidden();
  let parsedOrigin: string;
  try {
    parsedOrigin = new URL(origin).origin;
  } catch {
    throw errors.forbidden();
  }
  if (parsedOrigin !== new URL(applicationOrigin).origin) throw errors.forbidden();
}
