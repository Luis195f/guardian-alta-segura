import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import {
  OPERATIONAL_SOURCE_TYPES,
  type OperationalCursorPosition,
  type OperationalSourceType,
} from "@/domain/continuity/operational-continuity";

const CURSOR_VERSION = 1;

interface CursorPayload {
  readonly v: typeof CURSOR_VERSION;
  readonly context: string;
  readonly rank: number;
  readonly configuredAt: string | null;
  readonly sourceType: OperationalSourceType;
  readonly resourceId: string;
}

export class OperationalCursorError extends Error {
  constructor() {
    super("Invalid operational continuity cursor");
    this.name = "OperationalCursorError";
  }
}

export function operationalCursorContext(input: {
  readonly userId: string;
  readonly roles: readonly string[];
  readonly pageSize: number;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        userId: input.userId,
        roles: [...input.roles].sort(),
        pageSize: input.pageSize,
        scope: "operational-continuity-v1",
      }),
      "utf8",
    )
    .digest("base64url");
}

function signature(value: string, sessionId: string): Buffer {
  const key = createHash("sha256")
    .update(`operational-continuity-cursor:${sessionId}`, "utf8")
    .digest();
  return createHmac("sha256", key).update(value, "utf8").digest();
}

export function encodeOperationalCursor(input: {
  readonly position: OperationalCursorPosition;
  readonly context: string;
  readonly sessionId: string;
}): string {
  const payload: CursorPayload = {
    v: CURSOR_VERSION,
    context: input.context,
    rank: input.position.administrativeRank,
    configuredAt: input.position.configuredAt?.toISOString() ?? null,
    sourceType: input.position.sourceType,
    resourceId: input.position.resourceId,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${signature(encoded, input.sessionId).toString("base64url")}`;
}

function isSourceType(value: unknown): value is OperationalSourceType {
  return OPERATIONAL_SOURCE_TYPES.some((candidate) => candidate === value);
}

export function decodeOperationalCursor(input: {
  readonly cursor: string;
  readonly context: string;
  readonly sessionId: string;
}): OperationalCursorPosition {
  try {
    const parts = input.cursor.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) throw new OperationalCursorError();
    const actual = Buffer.from(parts[1], "base64url");
    const expected = signature(parts[0], input.sessionId);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new OperationalCursorError();
    }
    const payload = JSON.parse(
      Buffer.from(parts[0], "base64url").toString("utf8"),
    ) as Partial<CursorPayload>;
    const rank = payload.rank;
    const sourceType = payload.sourceType;
    const configuredAt =
      payload.configuredAt === null || payload.configuredAt === undefined
        ? null
        : new Date(payload.configuredAt);
    if (
      payload.v !== CURSOR_VERSION ||
      payload.context !== input.context ||
      !Number.isInteger(rank) ||
      (rank ?? -1) < 0 ||
      !isSourceType(sourceType) ||
      typeof payload.resourceId !== "string" ||
      payload.resourceId.length === 0 ||
      payload.resourceId.length > 128 ||
      (configuredAt !== null && Number.isNaN(configuredAt.getTime()))
    ) {
      throw new OperationalCursorError();
    }
    return {
      administrativeRank: rank as number,
      configuredAt,
      sourceType: sourceType as OperationalSourceType,
      resourceId: payload.resourceId,
    };
  } catch (error) {
    if (error instanceof OperationalCursorError) throw error;
    throw new OperationalCursorError();
  }
}
