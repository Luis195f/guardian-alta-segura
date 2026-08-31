import type {
  RelayAttestationVerifier,
  RelayAuthorityResolver,
} from "@/application/ports/continuity-relay";
import { assertServerOnlyRuntime } from "@/infrastructure/call-transport/server-only-guard";

assertServerOnlyRuntime();

/**
 * Deliberate production-safe default. The current canonical model has no approved
 * voice endpoint, recipient authority, locale, region, Line Region, or attestation source.
 */
export class UnavailableRelayAuthorityResolver implements RelayAuthorityResolver {
  async resolve(_input: Parameters<RelayAuthorityResolver["resolve"]>[0]): Promise<null> {
    void _input;
    return null;
  }

  async authorizeReview(
    _input: Parameters<RelayAuthorityResolver["authorizeReview"]>[0],
  ): Promise<null> {
    void _input;
    return null;
  }
}

export class UnavailableRelayAttestationVerifier implements RelayAttestationVerifier {
  async verify(
    _input: Parameters<RelayAttestationVerifier["verify"]>[0],
  ): Promise<{ readonly version: "PENDING_LOCAL_DECISION"; readonly current: false }> {
    void _input;
    return { version: "PENDING_LOCAL_DECISION", current: false };
  }
}
