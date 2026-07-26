import { describe, expect, it } from "vitest";

import {
  attachRuleObservationToVerifiedSource,
  CANONICAL_PROVENANCE_SCHEMA_VERSION,
  createAlertLineage,
  createRuleEvaluationLineage,
  mapCaregiverObservationProvenance,
  mapCheckInNonResponseProvenance,
  mapCheckInResponseProvenance,
  mapHomeSafetyReviewVersionProvenance,
  mapRuleInputSourceClaim,
  mapSafetyPlanVersionProvenance,
  parseCanonicalProvenanceLineage,
  ProvenanceValidationError,
  readAlertProvenance,
} from "@/domain/provenance/signal-provenance";

const episodeId = "episode-1";
const submittedAt = new Date("2026-07-26T08:00:00.000Z");

function checkInResponse() {
  const sourceRecord = {
    responseId: "response-1",
    assignmentId: "assignment-1",
    outcomeId: "outcome-1",
    episodeId,
    protocolVersionId: "protocol-version-1",
    protocolVersionNumber: 3,
    submittedById: "patient-1",
    submittedAt,
    answers: [{ shortTextValue: "clinical response text must never be copied" }],
    prompt: "clinical prompt must never be copied",
  };
  return mapCheckInResponseProvenance(sourceRecord);
}

function caregiverObservation() {
  const sourceRecord = {
    observationId: "observation-1",
    episodeId,
    caregiverUserId: "caregiver-1",
    caregiverAuthorizationId: "authorization-1",
    caregiverProfileId: "profile-1",
    caregiverSessionId: "session-1",
    submittedAt,
    content: "caregiver free text must never be copied",
  };
  return mapCaregiverObservationProvenance(sourceRecord);
}

describe("canonical signal provenance boundary", () => {
  it("versiona el contrato y referencia una respuesta sin copiar respuestas o prompts", () => {
    const response = checkInResponse();
    const lineage = parseCanonicalProvenanceLineage({
      schemaVersion: CANONICAL_PROVENANCE_SCHEMA_VERSION,
      episodeId,
      subject: response,
      parents: [],
    });

    expect(lineage.schemaVersion).toBe(1);
    expect(lineage.subject).toMatchObject({
      evidenceClass: "SOURCE",
      kind: "CHECK_IN_RESPONSE",
      resource: { resourceType: "CheckInResponse", resourceId: "response-1" },
      episodeId,
      terminalOutcome: "RESPONDED",
      protocolVersion: { resourceId: "protocol-version-1", versionNumber: 3 },
    });
    expect(JSON.stringify(lineage)).not.toContain("clinical response text");
    expect(JSON.stringify(lineage)).not.toContain("clinical prompt");
  });

  it.each([
    ["OMITTED", "PATIENT_OMITTED"],
    ["EXPIRED", "WINDOW_EXPIRED"],
  ] as const)("conserva no respuesta %s sin inferir riesgo", (outcomeType, reason) => {
    const sourceRecord = {
      nonResponseEventId: `non-response-${outcomeType.toLowerCase()}`,
      assignmentId: "assignment-1",
      outcomeId: "outcome-1",
      episodeId,
      protocolVersionId: "protocol-version-1",
      protocolVersionNumber: 3,
      outcomeType,
      reason,
      recordedById: "actor-1",
      recordedAt: submittedAt,
    };
    const reference = mapCheckInNonResponseProvenance(sourceRecord);

    expect(reference.terminalOutcome).toBe(outcomeType);
    expect(reference).not.toHaveProperty("risk");
    expect(reference).not.toHaveProperty("severity");
    expect(JSON.stringify(reference)).not.toContain(reason);
  });

  it("separa metadata verificada de la fuente y contexto declarado por la evaluación", () => {
    const verified = mapCheckInNonResponseProvenance({
      nonResponseEventId: "non-response-context",
      assignmentId: "assignment-context",
      outcomeId: "outcome-context",
      episodeId,
      protocolVersionId: "protocol-version-1",
      protocolVersionNumber: 3,
      outcomeType: "EXPIRED",
      recordedById: "actor-1",
      recordedAt: submittedAt,
    });
    const reference = attachRuleObservationToVerifiedSource(
      {
        inputKey: "non_response_hours",
        value: 48,
        observedAt: "2026-07-26T09:00:00.000Z",
        source: {
          resourceType: "NonResponseEvent",
          resourceId: "non-response-context",
          field: "elapsedHours",
          episodeId,
        },
      },
      episodeId,
      verified,
    );

    expect(reference.timestamps).toEqual({ recordedAt: submittedAt.toISOString() });
    expect(reference.timestamps).not.toHaveProperty("observedAt");
    expect(reference.ruleInputContext).toEqual({
      inputKey: "non_response_hours",
      sourceField: "elapsedHours",
      observedAt: "2026-07-26T09:00:00.000Z",
      verificationStatus: "DECLARED_NOT_SOURCE_VERIFIED",
    });
    expect(JSON.stringify(reference)).not.toContain('"value":48');
  });

  it("referencia una observación de cuidador sin crear aviso, tarea o acción", () => {
    const reference = caregiverObservation();

    expect(reference).toMatchObject({
      evidenceClass: "SOURCE",
      kind: "CAREGIVER_OBSERVATION",
      actor: { actorId: "caregiver-1", role: "caregiver" },
    });
    expect(reference).not.toHaveProperty("alertId");
    expect(reference).not.toHaveProperty("taskId");
    expect(reference).not.toHaveProperty("action");
    expect(JSON.stringify(reference)).not.toContain("caregiver free text");
  });

  it("referencia Plan de Seguridad y Domicilio Seguro por versión sin copiar contenido", () => {
    const safetyRecord = {
      versionId: "safety-plan-version-2",
      safetyPlanId: "safety-plan-1",
      episodeId,
      versionNumber: 2,
      createdById: "nurse-1",
      createdAt: submittedAt,
      content: "safety plan content must never be copied",
    };
    const homeRecord = {
      versionId: "home-safety-version-4",
      episodeId,
      versionNumber: 4,
      templateKey: "synthetic-home-safety-information",
      templateVersion: "demo-v1",
      actorUserId: "nurse-1",
      actorRole: "nurse" as const,
      recordedAt: submittedAt,
      items: [{ state: "FOLLOW_UP_PENDING" }],
    };

    const safety = mapSafetyPlanVersionProvenance(safetyRecord);
    const home = mapHomeSafetyReviewVersionProvenance(homeRecord);

    expect(safety).toMatchObject({
      kind: "SAFETY_PLAN_VERSION",
      documentVersion: 2,
      resource: { version: 2 },
    });
    expect(home).toMatchObject({
      kind: "HOME_SAFETY_REVIEW_VERSION",
      documentVersion: 4,
      templateReference: {
        key: "synthetic-home-safety-information",
        version: "demo-v1",
      },
    });
    expect(JSON.stringify([safety, home])).not.toContain("safety plan content");
    expect(JSON.stringify([safety, home])).not.toContain("FOLLOW_UP_PENDING");
  });

  it("representa dos fuentes, RuleEvaluation y Alert como linaje reproducible", () => {
    const sources = [checkInResponse(), caregiverObservation()];
    const evaluation = createRuleEvaluationLineage({
      evaluationId: "evaluation-1",
      episodeId,
      ruleDefinitionId: "rule-definition-1",
      ruleVersionId: "rule-version-2",
      ruleVersionNumber: 2,
      evaluatedById: "nurse-1",
      evaluatedAt: new Date("2026-07-26T09:00:00.000Z"),
      outcome: "matched",
      inputHash: "a".repeat(64),
      sources,
    });
    const alert = createAlertLineage({
      alertId: "alert-1",
      triggeredAt: new Date("2026-07-26T09:00:00.000Z"),
      evaluationLineage: evaluation,
    });

    expect(evaluation.parents).toHaveLength(2);
    expect(evaluation.subject).toMatchObject({
      kind: "RULE_EVALUATION",
      derivationType: "DETERMINISTIC_RULE_EVALUATION",
      rule: { definitionId: "rule-definition-1", versionId: "rule-version-2" },
      outcome: "matched",
      inputHash: "a".repeat(64),
    });
    expect(alert.subject).toMatchObject({
      kind: "ALERT",
      derivationType: "ALERT_FROM_MATCHED_RULE_EVALUATION",
    });
    expect(alert.parents.map(({ kind }) => kind)).toEqual([
      "RULE_EVALUATION",
      "CHECK_IN_RESPONSE",
      "CAREGIVER_OBSERVATION",
    ]);
    expect(readAlertProvenance([alert])).toEqual({ status: "VALID", lineage: alert });
  });

  it.each(["not-matched", "abstained"] as const)(
    "rechaza Alert lineage derivado de RuleEvaluation con outcome %s",
    (outcome) => {
      const evaluation = createRuleEvaluationLineage({
        evaluationId: `evaluation-${outcome}`,
        episodeId,
        ruleDefinitionId: "rule-definition-1",
        ruleVersionId: "rule-version-2",
        ruleVersionNumber: 2,
        evaluatedById: "nurse-1",
        evaluatedAt: new Date("2026-07-26T09:00:00.000Z"),
        outcome,
        inputHash: "c".repeat(64),
        sources: [checkInResponse()],
      });

      expect(() =>
        createAlertLineage({
          alertId: `alert-${outcome}`,
          triggeredAt: new Date("2026-07-26T09:00:00.000Z"),
          evaluationLineage: evaluation,
        }),
      ).toThrowError(expect.objectContaining({ code: "INVALID_LINEAGE" }));
    },
  );

  it("distingue dos campos técnicos del mismo registro sin aceptar duplicados exactos", () => {
    const response = checkInResponse();
    const sleepField = {
      ...response,
      ruleInputContext: {
        inputKey: "sleep_hours",
        sourceField: "sleepHours",
        observedAt: submittedAt.toISOString(),
        verificationStatus: "DECLARED_NOT_SOURCE_VERIFIED" as const,
      },
    };
    const adherenceField = {
      ...response,
      ruleInputContext: {
        inputKey: "medication_adherence",
        sourceField: "medicationAdherence",
        observedAt: submittedAt.toISOString(),
        verificationStatus: "DECLARED_NOT_SOURCE_VERIFIED" as const,
      },
    };
    const evaluationInput = {
      evaluationId: "evaluation-same-source",
      episodeId,
      ruleDefinitionId: "rule-definition-1",
      ruleVersionId: "rule-version-2",
      ruleVersionNumber: 2,
      evaluatedById: "nurse-1",
      evaluatedAt: new Date("2026-07-26T09:00:00.000Z"),
      outcome: "matched" as const,
      inputHash: "b".repeat(64),
    };

    const lineage = createRuleEvaluationLineage({
      ...evaluationInput,
      sources: [sleepField, adherenceField],
    });

    expect(
      lineage.parents.map((reference) =>
        reference.evidenceClass === "SOURCE" ? reference.ruleInputContext?.sourceField : null,
      ),
    ).toEqual(["sleepHours", "medicationAdherence"]);
    expect(() =>
      createRuleEvaluationLineage({
        ...evaluationInput,
        sources: [sleepField, sleepField],
      }),
    ).toThrowError(expect.objectContaining({ code: "INVALID_LINEAGE" }));
  });

  it("rechaza episode mismatch y referencias sin ID sin presentarlas como válidas", () => {
    expect(() =>
      mapRuleInputSourceClaim(
        {
          inputKey: "non_response_hours",
          value: 48,
          observedAt: submittedAt.toISOString(),
          source: {
            resourceType: "NonResponseEvent",
            resourceId: "non-response-1",
            field: "elapsedHours",
            episodeId: "episode-other",
          },
        },
        episodeId,
      ),
    ).toThrowError(expect.objectContaining({ code: "EPISODE_MISMATCH" }));

    expect(() =>
      mapRuleInputSourceClaim(
        {
          inputKey: "non_response_hours",
          value: 48,
          observedAt: submittedAt.toISOString(),
          source: {
            resourceType: "NonResponseEvent",
            resourceId: "",
            field: "elapsedHours",
            episodeId,
          },
        },
        episodeId,
      ),
    ).toThrowError(expect.objectContaining({ code: "INVALID_REFERENCE" }));
  });

  it("falla cerrado ante schemaVersion o source kind desconocidos con error sanitizado", () => {
    const valid = {
      schemaVersion: 1,
      episodeId,
      subject: checkInResponse(),
      parents: [],
    };
    let error: unknown;
    try {
      parseCanonicalProvenanceLineage({ ...valid, schemaVersion: 99 });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ProvenanceValidationError);
    expect(error).toMatchObject({ code: "UNKNOWN_SCHEMA_VERSION" });
    expect((error as Error).message).not.toContain("response-1");

    expect(() =>
      parseCanonicalProvenanceLineage({
        ...valid,
        subject: { ...valid.subject, kind: "UNKNOWN_SOURCE" },
      }),
    ).toThrowError(expect.objectContaining({ code: "UNKNOWN_EVIDENCE_KIND" }));
    expect(readAlertProvenance({ ...valid, schemaVersion: 99 })).toEqual({
      status: "INVALID",
      reason: "INVALID_OR_UNSUPPORTED_FORMAT",
    });
  });

  it("lee referencias históricas sin valores clínicos y sin fingir schema canónico", () => {
    const result = readAlertProvenance([
      {
        inputKey: "restricted_value",
        value: "clinical value must not escape",
        observedAt: submittedAt.toISOString(),
        source: {
          resourceType: "CheckInResponse",
          resourceId: "response-legacy",
          field: "answerCode",
        },
      },
    ]);

    expect(result).toEqual({
      status: "LEGACY_UNVERSIONED",
      references: [
        {
          resourceType: "CheckInResponse",
          resourceId: "response-legacy",
          field: "answerCode",
          observedAt: submittedAt.toISOString(),
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("clinical value");
  });

  it("rechaza campos desconocidos que podrían convertir provenance en payload clínico", () => {
    const source = checkInResponse();
    expect(() =>
      parseCanonicalProvenanceLineage({
        schemaVersion: 1,
        episodeId,
        subject: { ...source, clinicalContent: "must be rejected" },
        parents: [],
      }),
    ).toThrowError(expect.objectContaining({ code: "INVALID_REFERENCE" }));
  });
});
