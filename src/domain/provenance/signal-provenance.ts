import type { ReferencedRuleInput, RuleEvaluationOutcome } from "@/domain/alerts/explainable-rule";
import type { Role } from "@/domain/auth/role";

export const CANONICAL_PROVENANCE_SCHEMA_VERSION = 1 as const;

export const SOURCE_EVIDENCE_KINDS = [
  "CHECK_IN_RESPONSE",
  "CHECK_IN_NON_RESPONSE",
  "CAREGIVER_OBSERVATION",
  "SAFETY_PLAN_VERSION",
  "HOME_SAFETY_REVIEW_VERSION",
] as const;

export const DERIVED_EVIDENCE_KINDS = ["RULE_EVALUATION", "ALERT"] as const;

export type SourceEvidenceKind = (typeof SOURCE_EVIDENCE_KINDS)[number];
export type DerivedEvidenceKind = (typeof DERIVED_EVIDENCE_KINDS)[number];
export type EvidenceKind = SourceEvidenceKind | DerivedEvidenceKind;

export type InternalProducer =
  "CHECK_IN" | "CAREGIVER" | "SAFETY_PLAN" | "HOME_SAFETY" | "EXPLAINABLE_ALERTS";

export interface TechnicalResourceReference {
  readonly resourceType: string;
  readonly resourceId: string;
  readonly version?: number | string;
}

export interface ProvenanceTimestamps {
  readonly recordedAt?: string;
  readonly observedAt?: string;
  readonly receivedAt?: string;
  readonly submittedAt?: string;
  readonly createdAt?: string;
  readonly evaluatedAt?: string;
  readonly triggeredAt?: string;
}

interface EvidenceReferenceBase {
  readonly resource: TechnicalResourceReference;
  readonly episodeId: string;
  readonly producer: {
    readonly origin: "INTERNAL";
    readonly module: InternalProducer;
  };
  readonly timestamps: ProvenanceTimestamps;
  readonly actor?: {
    readonly actorId: string;
    readonly role?: Role;
  };
  readonly correlationId?: string;
}

export interface SourceEvidenceReference extends EvidenceReferenceBase {
  readonly evidenceClass: "SOURCE";
  readonly kind: SourceEvidenceKind;
  readonly ruleInputContext?: {
    readonly inputKey: string;
    readonly sourceField: string;
    readonly observedAt: string;
    readonly verificationStatus: "DECLARED_NOT_SOURCE_VERIFIED";
  };
  readonly terminalOutcome?: "RESPONDED" | "OMITTED" | "EXPIRED";
  readonly protocolVersion?: {
    readonly resourceId: string;
    readonly versionNumber: number;
  };
  readonly documentVersion?: number;
  readonly templateReference?: {
    readonly key: string;
    readonly version: string;
  };
  readonly relatedReferences: readonly TechnicalResourceReference[];
}

export interface RuleInputSourceClaim {
  readonly kind: SourceEvidenceKind;
  readonly resource: TechnicalResourceReference;
  readonly episodeId: string;
  readonly ruleInputContext: NonNullable<SourceEvidenceReference["ruleInputContext"]>;
}

export interface RuleEvaluationEvidenceReference extends EvidenceReferenceBase {
  readonly evidenceClass: "DERIVED";
  readonly kind: "RULE_EVALUATION";
  readonly derivationType: "DETERMINISTIC_RULE_EVALUATION";
  readonly rule: {
    readonly definitionId: string;
    readonly versionId: string;
    readonly versionNumber: number;
  };
  readonly outcome: RuleEvaluationOutcome;
  readonly inputHash: string;
}

export interface AlertEvidenceReference extends EvidenceReferenceBase {
  readonly evidenceClass: "DERIVED";
  readonly kind: "ALERT";
  readonly derivationType: "ALERT_FROM_MATCHED_RULE_EVALUATION";
  readonly rule: {
    readonly definitionId: string;
    readonly versionId: string;
    readonly versionNumber: number;
  };
}

export type EvidenceReference =
  SourceEvidenceReference | RuleEvaluationEvidenceReference | AlertEvidenceReference;

export interface CanonicalProvenanceLineageV1 {
  readonly schemaVersion: typeof CANONICAL_PROVENANCE_SCHEMA_VERSION;
  readonly episodeId: string;
  readonly subject: EvidenceReference;
  readonly parents: readonly EvidenceReference[];
}

export type ProvenanceValidationCode =
  | "UNKNOWN_SCHEMA_VERSION"
  | "UNKNOWN_EVIDENCE_KIND"
  | "INVALID_REFERENCE"
  | "EPISODE_MISMATCH"
  | "INVALID_LINEAGE";

export class ProvenanceValidationError extends Error {
  override readonly name = "ProvenanceValidationError";

  constructor(readonly code: ProvenanceValidationCode) {
    super("The provenance reference is invalid or unsupported");
  }
}

export interface LegacyTechnicalInputReference {
  readonly resourceType: string;
  readonly resourceId: string;
  readonly field: string;
  readonly observedAt: string;
}

export type AlertProvenanceReadResult =
  | {
      readonly status: "VALID";
      readonly lineage: CanonicalProvenanceLineageV1;
    }
  | {
      readonly status: "LEGACY_UNVERSIONED";
      readonly references: readonly LegacyTechnicalInputReference[];
    }
  | {
      readonly status: "INVALID";
      readonly reason: "INVALID_OR_UNSUPPORTED_FORMAT";
    };

const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const SAFE_FIELD = /^[A-Za-z][A-Za-z0-9_.:-]{0,127}$/;
const SHA_256 = /^[a-f0-9]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const ROLES: readonly Role[] = ["admin", "nurse", "clinician", "patient", "caregiver", "support"];

const KIND_RESOURCE: Readonly<Record<EvidenceKind, string>> = {
  CHECK_IN_RESPONSE: "CheckInResponse",
  CHECK_IN_NON_RESPONSE: "NonResponseEvent",
  CAREGIVER_OBSERVATION: "CaregiverObservation",
  SAFETY_PLAN_VERSION: "SafetyPlanVersion",
  HOME_SAFETY_REVIEW_VERSION: "HomeSafetyReviewVersion",
  RULE_EVALUATION: "RuleEvaluation",
  ALERT: "Alert",
};

const KIND_PRODUCER: Readonly<Record<EvidenceKind, InternalProducer>> = {
  CHECK_IN_RESPONSE: "CHECK_IN",
  CHECK_IN_NON_RESPONSE: "CHECK_IN",
  CAREGIVER_OBSERVATION: "CAREGIVER",
  SAFETY_PLAN_VERSION: "SAFETY_PLAN",
  HOME_SAFETY_REVIEW_VERSION: "HOME_SAFETY",
  RULE_EVALUATION: "EXPLAINABLE_ALERTS",
  ALERT: "EXPLAINABLE_ALERTS",
};

function fail(code: ProvenanceValidationCode): never {
  throw new ProvenanceValidationError(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function safeIdentifier(value: unknown): string {
  if (typeof value !== "string" || !SAFE_IDENTIFIER.test(value)) fail("INVALID_REFERENCE");
  return value;
}

function positiveVersion(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) < 1) fail("INVALID_REFERENCE");
  return value as number;
}

function isoTimestamp(value: unknown): string {
  if (typeof value !== "string") fail("INVALID_REFERENCE");
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString() !== value) fail("INVALID_REFERENCE");
  return value;
}

function optionalTimestamp(value: unknown): string | undefined {
  return value === undefined ? undefined : isoTimestamp(value);
}

function parseResourceReference(value: unknown): TechnicalResourceReference {
  if (!isRecord(value) || !hasOnlyKeys(value, ["resourceType", "resourceId", "version"])) {
    fail("INVALID_REFERENCE");
  }
  const resourceType = safeIdentifier(value.resourceType);
  const resourceId = safeIdentifier(value.resourceId);
  if (
    value.version !== undefined &&
    !(
      (typeof value.version === "string" && SAFE_IDENTIFIER.test(value.version)) ||
      (Number.isInteger(value.version) && Number(value.version) > 0)
    )
  ) {
    fail("INVALID_REFERENCE");
  }
  return {
    resourceType,
    resourceId,
    ...(value.version !== undefined ? { version: value.version as number | string } : {}),
  };
}

function parseTimestamps(value: unknown): ProvenanceTimestamps {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "recordedAt",
      "observedAt",
      "receivedAt",
      "submittedAt",
      "createdAt",
      "evaluatedAt",
      "triggeredAt",
    ])
  ) {
    fail("INVALID_REFERENCE");
  }
  const timestamps = {
    recordedAt: optionalTimestamp(value.recordedAt),
    observedAt: optionalTimestamp(value.observedAt),
    receivedAt: optionalTimestamp(value.receivedAt),
    submittedAt: optionalTimestamp(value.submittedAt),
    createdAt: optionalTimestamp(value.createdAt),
    evaluatedAt: optionalTimestamp(value.evaluatedAt),
    triggeredAt: optionalTimestamp(value.triggeredAt),
  };
  const defined = Object.values(timestamps).filter(
    (timestamp): timestamp is string => timestamp !== undefined,
  );
  if (defined.length === 0) fail("INVALID_REFERENCE");
  return Object.fromEntries(
    Object.entries(timestamps).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}

function parseActor(value: unknown): EvidenceReferenceBase["actor"] {
  if (value === undefined) return undefined;
  if (!isRecord(value) || !hasOnlyKeys(value, ["actorId", "role"])) {
    fail("INVALID_REFERENCE");
  }
  const actorId = safeIdentifier(value.actorId);
  if (value.role !== undefined && !ROLES.includes(value.role as Role)) {
    fail("INVALID_REFERENCE");
  }
  return {
    actorId,
    ...(value.role !== undefined ? { role: value.role as Role } : {}),
  };
}

function parseCommon(value: Record<string, unknown>, kind: EvidenceKind) {
  const resource = parseResourceReference(value.resource);
  if (resource.resourceType !== KIND_RESOURCE[kind]) fail("INVALID_REFERENCE");
  const episodeId = safeIdentifier(value.episodeId);
  if (
    !isRecord(value.producer) ||
    !hasOnlyKeys(value.producer, ["origin", "module"]) ||
    value.producer.origin !== "INTERNAL" ||
    value.producer.module !== KIND_PRODUCER[kind]
  ) {
    fail("INVALID_REFERENCE");
  }
  const actor = parseActor(value.actor);
  if (
    value.correlationId !== undefined &&
    (typeof value.correlationId !== "string" || !UUID.test(value.correlationId))
  ) {
    fail("INVALID_REFERENCE");
  }
  return {
    resource,
    episodeId,
    producer: {
      origin: "INTERNAL" as const,
      module: value.producer.module as InternalProducer,
    },
    timestamps: parseTimestamps(value.timestamps),
    ...(actor ? { actor } : {}),
    ...(value.correlationId !== undefined ? { correlationId: value.correlationId as string } : {}),
  };
}

function parseSourceReference(
  value: Record<string, unknown>,
  kind: SourceEvidenceKind,
): SourceEvidenceReference {
  if (
    !hasOnlyKeys(value, [
      "evidenceClass",
      "kind",
      "resource",
      "episodeId",
      "producer",
      "timestamps",
      "actor",
      "correlationId",
      "ruleInputContext",
      "terminalOutcome",
      "protocolVersion",
      "documentVersion",
      "templateReference",
      "relatedReferences",
    ]) ||
    !Array.isArray(value.relatedReferences)
  ) {
    fail("INVALID_REFERENCE");
  }
  const common = parseCommon(value, kind);
  let ruleInputContext: SourceEvidenceReference["ruleInputContext"];
  if (value.ruleInputContext !== undefined) {
    if (
      !isRecord(value.ruleInputContext) ||
      !hasOnlyKeys(value.ruleInputContext, [
        "inputKey",
        "sourceField",
        "observedAt",
        "verificationStatus",
      ]) ||
      value.ruleInputContext.verificationStatus !== "DECLARED_NOT_SOURCE_VERIFIED"
    ) {
      fail("INVALID_REFERENCE");
    }
    ruleInputContext = {
      inputKey: safeIdentifier(value.ruleInputContext.inputKey),
      sourceField: safeIdentifier(value.ruleInputContext.sourceField),
      observedAt: isoTimestamp(value.ruleInputContext.observedAt),
      verificationStatus: "DECLARED_NOT_SOURCE_VERIFIED",
    };
  }
  if (
    value.terminalOutcome !== undefined &&
    !["RESPONDED", "OMITTED", "EXPIRED"].includes(String(value.terminalOutcome))
  ) {
    fail("INVALID_REFERENCE");
  }
  if (
    kind === "CHECK_IN_RESPONSE" &&
    value.terminalOutcome !== undefined &&
    value.terminalOutcome !== "RESPONDED"
  ) {
    fail("INVALID_REFERENCE");
  }
  if (
    kind === "CHECK_IN_NON_RESPONSE" &&
    value.terminalOutcome !== undefined &&
    !["OMITTED", "EXPIRED"].includes(String(value.terminalOutcome))
  ) {
    fail("INVALID_REFERENCE");
  }
  let protocolVersion: SourceEvidenceReference["protocolVersion"];
  if (value.protocolVersion !== undefined) {
    if (
      !isRecord(value.protocolVersion) ||
      !hasOnlyKeys(value.protocolVersion, ["resourceId", "versionNumber"])
    ) {
      fail("INVALID_REFERENCE");
    }
    protocolVersion = {
      resourceId: safeIdentifier(value.protocolVersion.resourceId),
      versionNumber: positiveVersion(value.protocolVersion.versionNumber),
    };
  }
  let templateReference: SourceEvidenceReference["templateReference"];
  if (value.templateReference !== undefined) {
    if (
      !isRecord(value.templateReference) ||
      !hasOnlyKeys(value.templateReference, ["key", "version"])
    ) {
      fail("INVALID_REFERENCE");
    }
    templateReference = {
      key: safeIdentifier(value.templateReference.key),
      version: safeIdentifier(value.templateReference.version),
    };
  }
  return {
    evidenceClass: "SOURCE",
    kind,
    ...common,
    ...(ruleInputContext ? { ruleInputContext } : {}),
    ...(value.terminalOutcome !== undefined
      ? {
          terminalOutcome: value.terminalOutcome as "RESPONDED" | "OMITTED" | "EXPIRED",
        }
      : {}),
    ...(protocolVersion ? { protocolVersion } : {}),
    ...(value.documentVersion !== undefined
      ? { documentVersion: positiveVersion(value.documentVersion) }
      : {}),
    ...(templateReference ? { templateReference } : {}),
    relatedReferences: value.relatedReferences.map(parseResourceReference),
  };
}

function parseRule(
  value: unknown,
): RuleEvaluationEvidenceReference["rule"] | AlertEvidenceReference["rule"] {
  if (!isRecord(value) || !hasOnlyKeys(value, ["definitionId", "versionId", "versionNumber"])) {
    fail("INVALID_REFERENCE");
  }
  return {
    definitionId: safeIdentifier(value.definitionId),
    versionId: safeIdentifier(value.versionId),
    versionNumber: positiveVersion(value.versionNumber),
  };
}

function parseDerivedReference(
  value: Record<string, unknown>,
  kind: DerivedEvidenceKind,
): RuleEvaluationEvidenceReference | AlertEvidenceReference {
  if (
    !hasOnlyKeys(value, [
      "evidenceClass",
      "kind",
      "resource",
      "episodeId",
      "producer",
      "timestamps",
      "actor",
      "correlationId",
      "derivationType",
      "rule",
      "outcome",
      "inputHash",
    ])
  ) {
    fail("INVALID_REFERENCE");
  }
  const common = parseCommon(value, kind);
  const rule = parseRule(value.rule);
  if (kind === "RULE_EVALUATION") {
    if (
      value.derivationType !== "DETERMINISTIC_RULE_EVALUATION" ||
      !["matched", "not-matched", "abstained"].includes(String(value.outcome)) ||
      typeof value.inputHash !== "string" ||
      !SHA_256.test(value.inputHash)
    ) {
      fail("INVALID_REFERENCE");
    }
    return {
      evidenceClass: "DERIVED",
      kind,
      ...common,
      derivationType: "DETERMINISTIC_RULE_EVALUATION",
      rule,
      outcome: value.outcome as RuleEvaluationOutcome,
      inputHash: value.inputHash,
    };
  }
  if (
    value.derivationType !== "ALERT_FROM_MATCHED_RULE_EVALUATION" ||
    value.outcome !== undefined ||
    value.inputHash !== undefined
  ) {
    fail("INVALID_REFERENCE");
  }
  return {
    evidenceClass: "DERIVED",
    kind,
    ...common,
    derivationType: "ALERT_FROM_MATCHED_RULE_EVALUATION",
    rule,
  };
}

function parseEvidenceReference(value: unknown): EvidenceReference {
  if (
    !isRecord(value) ||
    !["SOURCE", "DERIVED"].includes(String(value.evidenceClass)) ||
    typeof value.kind !== "string"
  ) {
    fail("INVALID_REFERENCE");
  }
  if ((SOURCE_EVIDENCE_KINDS as readonly string[]).includes(value.kind)) {
    if (value.evidenceClass !== "SOURCE") fail("INVALID_REFERENCE");
    return parseSourceReference(value, value.kind as SourceEvidenceKind);
  }
  if ((DERIVED_EVIDENCE_KINDS as readonly string[]).includes(value.kind)) {
    if (value.evidenceClass !== "DERIVED") fail("INVALID_REFERENCE");
    return parseDerivedReference(value, value.kind as DerivedEvidenceKind);
  }
  fail("UNKNOWN_EVIDENCE_KIND");
}

export function parseCanonicalProvenanceLineage(value: unknown): CanonicalProvenanceLineageV1 {
  if (!isRecord(value)) fail("INVALID_REFERENCE");
  if (value.schemaVersion !== CANONICAL_PROVENANCE_SCHEMA_VERSION) {
    fail("UNKNOWN_SCHEMA_VERSION");
  }
  if (
    !hasOnlyKeys(value, ["schemaVersion", "episodeId", "subject", "parents"]) ||
    !Array.isArray(value.parents)
  ) {
    fail("INVALID_LINEAGE");
  }
  const episodeId = safeIdentifier(value.episodeId);
  const subject = parseEvidenceReference(value.subject);
  const parents = value.parents.map(parseEvidenceReference);
  if (
    subject.episodeId !== episodeId ||
    parents.some((reference) => reference.episodeId !== episodeId)
  ) {
    fail("EPISODE_MISMATCH");
  }
  if (subject.evidenceClass === "SOURCE" && parents.length > 0) {
    fail("INVALID_LINEAGE");
  }
  if (
    subject.kind === "RULE_EVALUATION" &&
    parents.some((reference) => reference.evidenceClass !== "SOURCE")
  ) {
    fail("INVALID_LINEAGE");
  }
  if (
    subject.kind === "ALERT" &&
    (parents.filter((reference) => reference.kind === "RULE_EVALUATION").length !== 1 ||
      parents.find((reference) => reference.kind === "RULE_EVALUATION")?.outcome !== "matched" ||
      parents.some(
        (reference) => reference.kind !== "RULE_EVALUATION" && reference.evidenceClass !== "SOURCE",
      ))
  ) {
    fail("INVALID_LINEAGE");
  }
  const identities = [subject, ...parents].map((reference) => {
    const resourceIdentity = `${reference.resource.resourceType}/${reference.resource.resourceId}`;
    return reference.evidenceClass === "SOURCE"
      ? `${resourceIdentity}#${reference.ruleInputContext?.sourceField ?? ""}`
      : resourceIdentity;
  });
  if (new Set(identities).size !== identities.length) fail("INVALID_LINEAGE");
  return {
    schemaVersion: CANONICAL_PROVENANCE_SCHEMA_VERSION,
    episodeId,
    subject,
    parents,
  };
}

function sourceReference(input: Omit<SourceEvidenceReference, "evidenceClass">) {
  return parseEvidenceReference({
    evidenceClass: "SOURCE",
    ...input,
  }) as SourceEvidenceReference;
}

function technicalReference(
  resourceType: string,
  resourceId: string,
  version?: number | string,
): TechnicalResourceReference {
  return parseResourceReference({
    resourceType,
    resourceId,
    ...(version !== undefined ? { version } : {}),
  });
}

export function mapCheckInResponseProvenance(input: {
  readonly responseId: string;
  readonly assignmentId: string;
  readonly outcomeId: string;
  readonly episodeId: string;
  readonly protocolVersionId: string;
  readonly protocolVersionNumber: number;
  readonly submittedById: string;
  readonly submittedAt: Date;
}): SourceEvidenceReference {
  return sourceReference({
    kind: "CHECK_IN_RESPONSE",
    resource: technicalReference("CheckInResponse", input.responseId),
    episodeId: input.episodeId,
    producer: { origin: "INTERNAL", module: "CHECK_IN" },
    timestamps: { submittedAt: input.submittedAt.toISOString() },
    actor: { actorId: input.submittedById },
    terminalOutcome: "RESPONDED",
    protocolVersion: {
      resourceId: input.protocolVersionId,
      versionNumber: input.protocolVersionNumber,
    },
    relatedReferences: [
      technicalReference("CheckInAssignment", input.assignmentId),
      technicalReference("CheckInOutcome", input.outcomeId),
    ],
  });
}

export function mapCheckInNonResponseProvenance(input: {
  readonly nonResponseEventId: string;
  readonly assignmentId: string;
  readonly outcomeId: string;
  readonly episodeId: string;
  readonly protocolVersionId: string;
  readonly protocolVersionNumber: number;
  readonly outcomeType: "OMITTED" | "EXPIRED";
  readonly recordedById: string;
  readonly recordedAt: Date;
}): SourceEvidenceReference {
  return sourceReference({
    kind: "CHECK_IN_NON_RESPONSE",
    resource: technicalReference("NonResponseEvent", input.nonResponseEventId),
    episodeId: input.episodeId,
    producer: { origin: "INTERNAL", module: "CHECK_IN" },
    timestamps: { recordedAt: input.recordedAt.toISOString() },
    actor: { actorId: input.recordedById },
    terminalOutcome: input.outcomeType,
    protocolVersion: {
      resourceId: input.protocolVersionId,
      versionNumber: input.protocolVersionNumber,
    },
    relatedReferences: [
      technicalReference("CheckInAssignment", input.assignmentId),
      technicalReference("CheckInOutcome", input.outcomeId),
    ],
  });
}

export function mapCaregiverObservationProvenance(input: {
  readonly observationId: string;
  readonly episodeId: string;
  readonly caregiverUserId: string;
  readonly caregiverAuthorizationId: string;
  readonly caregiverProfileId: string;
  readonly caregiverSessionId: string;
  readonly submittedAt: Date;
}): SourceEvidenceReference {
  return sourceReference({
    kind: "CAREGIVER_OBSERVATION",
    resource: technicalReference("CaregiverObservation", input.observationId),
    episodeId: input.episodeId,
    producer: { origin: "INTERNAL", module: "CAREGIVER" },
    timestamps: { submittedAt: input.submittedAt.toISOString() },
    actor: { actorId: input.caregiverUserId, role: "caregiver" },
    relatedReferences: [
      technicalReference("CaregiverAuthorization", input.caregiverAuthorizationId),
      technicalReference("CaregiverProfile", input.caregiverProfileId),
      technicalReference("CaregiverSession", input.caregiverSessionId),
    ],
  });
}

export function mapSafetyPlanVersionProvenance(input: {
  readonly versionId: string;
  readonly safetyPlanId: string;
  readonly episodeId: string;
  readonly versionNumber: number;
  readonly createdById: string;
  readonly createdAt: Date;
}): SourceEvidenceReference {
  return sourceReference({
    kind: "SAFETY_PLAN_VERSION",
    resource: technicalReference("SafetyPlanVersion", input.versionId, input.versionNumber),
    episodeId: input.episodeId,
    producer: { origin: "INTERNAL", module: "SAFETY_PLAN" },
    timestamps: { createdAt: input.createdAt.toISOString() },
    actor: { actorId: input.createdById },
    documentVersion: input.versionNumber,
    relatedReferences: [technicalReference("SafetyPlan", input.safetyPlanId)],
  });
}

export function mapHomeSafetyReviewVersionProvenance(input: {
  readonly versionId: string;
  readonly episodeId: string;
  readonly versionNumber: number;
  readonly templateKey: string;
  readonly templateVersion: string;
  readonly actorUserId: string;
  readonly actorRole?: "nurse" | "clinician";
  readonly recordedAt: Date;
}): SourceEvidenceReference {
  return sourceReference({
    kind: "HOME_SAFETY_REVIEW_VERSION",
    resource: technicalReference("HomeSafetyReviewVersion", input.versionId, input.versionNumber),
    episodeId: input.episodeId,
    producer: { origin: "INTERNAL", module: "HOME_SAFETY" },
    timestamps: { recordedAt: input.recordedAt.toISOString() },
    actor: {
      actorId: input.actorUserId,
      ...(input.actorRole ? { role: input.actorRole } : {}),
    },
    documentVersion: input.versionNumber,
    templateReference: {
      key: input.templateKey,
      version: input.templateVersion,
    },
    relatedReferences: [],
  });
}

export function mapRuleInputSourceClaim(
  input: ReferencedRuleInput,
  expectedEpisodeId: string,
): RuleInputSourceClaim {
  if (input.source.episodeId !== expectedEpisodeId) fail("EPISODE_MISMATCH");
  const kindByResource: Readonly<Record<string, SourceEvidenceKind>> = {
    CheckInResponse: "CHECK_IN_RESPONSE",
    NonResponseEvent: "CHECK_IN_NON_RESPONSE",
    CaregiverObservation: "CAREGIVER_OBSERVATION",
    SafetyPlanVersion: "SAFETY_PLAN_VERSION",
    HomeSafetyReviewVersion: "HOME_SAFETY_REVIEW_VERSION",
  };
  const kind = kindByResource[input.source.resourceType];
  if (!kind) fail("UNKNOWN_EVIDENCE_KIND");
  return {
    kind,
    resource: technicalReference(input.source.resourceType, input.source.resourceId),
    episodeId: input.source.episodeId,
    ruleInputContext: {
      inputKey: safeIdentifier(input.inputKey),
      sourceField: safeIdentifier(input.source.field),
      observedAt: isoTimestamp(input.observedAt),
      verificationStatus: "DECLARED_NOT_SOURCE_VERIFIED",
    },
  };
}

export function attachRuleObservationToVerifiedSource(
  input: ReferencedRuleInput,
  expectedEpisodeId: string,
  verifiedSource: SourceEvidenceReference,
): SourceEvidenceReference {
  const claimedSource = mapRuleInputSourceClaim(input, expectedEpisodeId);
  if (
    verifiedSource.episodeId !== expectedEpisodeId ||
    verifiedSource.kind !== claimedSource.kind ||
    verifiedSource.resource.resourceType !== claimedSource.resource.resourceType ||
    verifiedSource.resource.resourceId !== claimedSource.resource.resourceId
  ) {
    fail("INVALID_REFERENCE");
  }
  return sourceReference({
    ...verifiedSource,
    ruleInputContext: claimedSource.ruleInputContext,
  });
}

export function createRuleEvaluationLineage(input: {
  readonly evaluationId: string;
  readonly episodeId: string;
  readonly ruleDefinitionId: string;
  readonly ruleVersionId: string;
  readonly ruleVersionNumber: number;
  readonly evaluatedById: string;
  readonly evaluatedAt: Date;
  readonly outcome: RuleEvaluationOutcome;
  readonly inputHash: string;
  readonly correlationId?: string;
  readonly sources: readonly SourceEvidenceReference[];
}): CanonicalProvenanceLineageV1 {
  return parseCanonicalProvenanceLineage({
    schemaVersion: CANONICAL_PROVENANCE_SCHEMA_VERSION,
    episodeId: input.episodeId,
    subject: {
      evidenceClass: "DERIVED",
      kind: "RULE_EVALUATION",
      resource: technicalReference("RuleEvaluation", input.evaluationId),
      episodeId: input.episodeId,
      producer: { origin: "INTERNAL", module: "EXPLAINABLE_ALERTS" },
      timestamps: { evaluatedAt: input.evaluatedAt.toISOString() },
      actor: { actorId: input.evaluatedById },
      ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      derivationType: "DETERMINISTIC_RULE_EVALUATION",
      rule: {
        definitionId: input.ruleDefinitionId,
        versionId: input.ruleVersionId,
        versionNumber: input.ruleVersionNumber,
      },
      outcome: input.outcome,
      inputHash: input.inputHash,
    },
    parents: input.sources,
  });
}

export function createAlertLineage(input: {
  readonly alertId: string;
  readonly triggeredAt: Date;
  readonly evaluationLineage: CanonicalProvenanceLineageV1;
}): CanonicalProvenanceLineageV1 {
  if (input.evaluationLineage.subject.kind !== "RULE_EVALUATION") {
    fail("INVALID_LINEAGE");
  }
  const evaluation = input.evaluationLineage.subject;
  if (evaluation.outcome !== "matched") {
    fail("INVALID_LINEAGE");
  }
  return parseCanonicalProvenanceLineage({
    schemaVersion: CANONICAL_PROVENANCE_SCHEMA_VERSION,
    episodeId: input.evaluationLineage.episodeId,
    subject: {
      evidenceClass: "DERIVED",
      kind: "ALERT",
      resource: technicalReference("Alert", input.alertId),
      episodeId: input.evaluationLineage.episodeId,
      producer: { origin: "INTERNAL", module: "EXPLAINABLE_ALERTS" },
      timestamps: { triggeredAt: input.triggeredAt.toISOString() },
      derivationType: "ALERT_FROM_MATCHED_RULE_EVALUATION",
      rule: evaluation.rule,
    },
    parents: [evaluation, ...input.evaluationLineage.parents],
  });
}

function readLegacyReferences(value: unknown): readonly LegacyTechnicalInputReference[] | null {
  if (!Array.isArray(value)) return null;
  const references: LegacyTechnicalInputReference[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.observedAt !== "string" ||
      !isRecord(item.source) ||
      typeof item.source.resourceType !== "string" ||
      typeof item.source.resourceId !== "string" ||
      typeof item.source.field !== "string" ||
      !SAFE_IDENTIFIER.test(item.source.resourceType) ||
      !SAFE_IDENTIFIER.test(item.source.resourceId) ||
      !SAFE_FIELD.test(item.source.field)
    ) {
      return null;
    }
    try {
      references.push({
        resourceType: item.source.resourceType,
        resourceId: item.source.resourceId,
        field: item.source.field,
        observedAt: isoTimestamp(item.observedAt),
      });
    } catch {
      return null;
    }
  }
  return references;
}

export function readAlertProvenance(value: unknown): AlertProvenanceReadResult {
  if (
    Array.isArray(value) &&
    value.length === 1 &&
    isRecord(value[0]) &&
    "schemaVersion" in value[0]
  ) {
    try {
      return { status: "VALID", lineage: parseCanonicalProvenanceLineage(value[0]) };
    } catch {
      return { status: "INVALID", reason: "INVALID_OR_UNSUPPORTED_FORMAT" };
    }
  }
  const legacy = readLegacyReferences(value);
  if (legacy) return { status: "LEGACY_UNVERSIONED", references: legacy };
  try {
    return { status: "VALID", lineage: parseCanonicalProvenanceLineage(value) };
  } catch {
    return { status: "INVALID", reason: "INVALID_OR_UNSUPPORTED_FORMAT" };
  }
}
