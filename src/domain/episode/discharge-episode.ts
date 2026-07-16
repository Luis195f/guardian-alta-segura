import type { Role } from "@/domain/auth/role";

export const EPISODE_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "CLOSED"] as const;
export type EpisodeStatus = (typeof EPISODE_STATUSES)[number];

export const PROGRAM_LENGTH_DAYS = [30, 60, 90] as const;
export type ProgramLengthDays = (typeof PROGRAM_LENGTH_DAYS)[number];

export type EpisodeActorRole = Extract<Role, "nurse" | "clinician">;

const transitions: Readonly<Record<EpisodeStatus, readonly EpisodeStatus[]>> = {
  DRAFT: ["ACTIVE"],
  ACTIVE: ["PAUSED", "CLOSED"],
  PAUSED: ["ACTIVE", "CLOSED"],
  CLOSED: [],
};

export class IllegalEpisodeTransitionError extends Error {
  constructor(from: EpisodeStatus, to: EpisodeStatus) {
    super(`Illegal discharge episode transition: ${from} -> ${to}`);
    this.name = "IllegalEpisodeTransitionError";
  }
}

export function isEpisodeStatus(value: unknown): value is EpisodeStatus {
  return typeof value === "string" && EPISODE_STATUSES.some((status) => status === value);
}

export function isProgramLengthDays(value: unknown): value is ProgramLengthDays {
  return (
    typeof value === "number" &&
    PROGRAM_LENGTH_DAYS.some((programLength) => programLength === value)
  );
}

export function assertLegalEpisodeTransition(from: EpisodeStatus, to: EpisodeStatus): void {
  if (!transitions[from].includes(to)) throw new IllegalEpisodeTransitionError(from, to);
}

export function selectEpisodeActorRole(roles: readonly Role[]): EpisodeActorRole | null {
  if (roles.includes("nurse")) return "nurse";
  if (roles.includes("clinician")) return "clinician";
  return null;
}

export function normalizeRequiredReason(value: string | null | undefined): string {
  const reason = value?.trim() ?? "";
  if (!reason || reason.length > 500)
    throw new Error("A reason between 1 and 500 chars is required");
  return reason;
}
