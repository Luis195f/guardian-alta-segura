const PRISMA_ERROR_CODE = /^P[0-9]{4}$/;
const CANONICAL_METADATA = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export class CanonicalPolicyMismatchError extends Error {
  constructor(policyKey, version) {
    super("Canonical policy configuration does not match persisted append-only history");
    this.name = "CanonicalPolicyMismatchError";
    this.policyKey = policyKey;
    this.version = version;
  }
}

function readAllowlistedString(error, field, pattern, fallback) {
  try {
    const value =
      error !== null && (typeof error === "object" || typeof error === "function")
        ? error[field]
        : undefined;
    return typeof value === "string" && pattern.test(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function isCanonicalPolicyMismatch(error) {
  try {
    return error instanceof CanonicalPolicyMismatchError;
  } catch {
    return false;
  }
}

export function formatSafeSeedError(error) {
  if (isCanonicalPolicyMismatch(error)) {
    return {
      code: "CANONICAL_POLICY_MISMATCH",
      policyKey: readAllowlistedString(error, "policyKey", CANONICAL_METADATA, "UNCLASSIFIED"),
      version: readAllowlistedString(error, "version", CANONICAL_METADATA, "UNCLASSIFIED"),
    };
  }

  return {
    code: "SYNTHETIC_SEED_FAILED",
    technicalCode: readAllowlistedString(error, "code", PRISMA_ERROR_CODE, "UNCLASSIFIED"),
  };
}

export function writeSafeSeedError(error, writeLine = (line) => console.error(line)) {
  writeLine(JSON.stringify(formatSafeSeedError(error)));
}
