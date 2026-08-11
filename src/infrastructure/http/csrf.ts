import { errors } from "@/infrastructure/http/app-error";

export function assertSameOrigin(request: Request, applicationOrigin: string): void {
  const origin = request.headers.get("origin");
  if (!origin) throw errors.forbidden();
  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    throw errors.forbidden();
  }
  if (origin !== parsedOrigin.origin || parsedOrigin.origin !== new URL(applicationOrigin).origin) {
    throw errors.forbidden();
  }
}
