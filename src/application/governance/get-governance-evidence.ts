import type { GovernanceEvidenceReader } from "@/application/ports/governance-evidence-reader";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import {
  projectEpisodeGovernanceEvidence,
  type EpisodeGovernanceEvidenceView,
} from "@/domain/governance/governance-evidence";

export class GovernanceEvidenceDeniedError extends Error {}
export class GovernanceEvidenceInvalidError extends Error {}
export class GovernanceEvidenceNotFoundError extends Error {}
export class GovernanceEvidenceConcurrentChangeError extends Error {}

const TECHNICAL_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;

function professionalRoles(actor: AuthenticatedPrincipal): readonly ("nurse" | "clinician")[] {
  return actor.roles.filter(
    (role): role is "nurse" | "clinician" => role === "nurse" || role === "clinician",
  );
}

export class GetEpisodeGovernanceEvidenceService {
  constructor(private readonly reader: GovernanceEvidenceReader) {}

  async execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly episodeId: string;
    readonly correlationId: string;
    readonly now?: Date;
  }): Promise<EpisodeGovernanceEvidenceView> {
    const roles = professionalRoles(input.actor);
    if (roles.length === 0) throw new GovernanceEvidenceDeniedError("Evidence access denied");
    if (!TECHNICAL_IDENTIFIER_PATTERN.test(input.episodeId)) {
      throw new GovernanceEvidenceInvalidError("Invalid governance evidence request");
    }
    const generatedAt = input.now ?? new Date();
    const snapshot = await this.reader.readAuthorizedEpisodeEvidenceSnapshot({
      episodeId: input.episodeId,
      actorUserId: input.actor.userId,
      actorProfessionalRoles: roles,
      correlationId: input.correlationId,
      evaluatedAt: generatedAt,
    });
    if (!snapshot) throw new GovernanceEvidenceNotFoundError("Evidence source not found");
    if (
      snapshot.source.episode.id !== snapshot.governance.episodeId ||
      snapshot.source.episode.version !== snapshot.governance.episodeVersion ||
      snapshot.source.episode.state !== snapshot.governance.episodeStatus
    ) {
      throw new GovernanceEvidenceConcurrentChangeError(
        "Governance evidence snapshot is structurally inconsistent",
      );
    }
    return projectEpisodeGovernanceEvidence({ ...snapshot, generatedAt });
  }
}
