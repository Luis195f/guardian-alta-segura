import { randomUUID } from "node:crypto";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getCorrelationId(request: Request): string {
  const candidate = request.headers.get("x-correlation-id");
  return candidate && uuidPattern.test(candidate) ? candidate : randomUUID();
}
