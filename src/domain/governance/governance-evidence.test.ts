import { describe, expect, it } from "vitest";

import type { GovernanceEvidenceSource } from "@/application/ports/governance-evidence-reader";
import type { EpisodeGovernanceView } from "@/domain/episode/activation-policy";
import { projectEpisodeGovernanceEvidence } from "@/domain/governance/governance-evidence";
import {
  createAlertLineage,
  createRuleEvaluationLineage,
  mapSafetyPlanVersionProvenance,
} from "@/domain/provenance/signal-provenance";

const now = new Date("2026-07-27T10:00:00.000Z");
const episodeId = "episode-1";
const nurseId = "nurse-1";
const clinicianId = "clinician-1";

function governance(): EpisodeGovernanceView {
  return {
    episodeId,
    episodeVersion: 2,
    episodeStatus: "ACTIVE",
    responsibleNurse: { userId: nurseId, active: true },
    responsibleClinician: { userId: clinicianId, active: true },
    checkInProtocol: {
      versionId: "protocol-v1",
      protocolKey: "synthetic-protocol",
      versionNumber: 1,
      state: "SYNTHETIC_DEMO",
      isSyntheticFixture: true,
    },
    activationAuthorization: {
      status: "AUTHORIZED",
      identityPolicyVersionId: "identity-policy-v1",
    },
    openObligations: [],
    blockers: [
      {
        category: "LOCAL_POLICY_PENDING",
        code: "DEC_002_EPISODE_CLOSURE_POLICY_PENDING",
        resourceIds: [],
        correlationId: null,
      },
    ],
    pendingInstitutionalDecisions: [{ decisionId: "DEC-002", status: "PENDING" }],
    organizationallyGoverned: false,
    transitionDecision: { targetStatus: "CLOSED", authorization: "NOT_AUTHORIZED" },
    evaluatedAt: now,
  };
}

function alert() {
  const source = mapSafetyPlanVersionProvenance({
    versionId: "safety-plan-version-1",
    safetyPlanId: "safety-plan-1",
    episodeId,
    versionNumber: 1,
    createdById: nurseId,
    createdAt: new Date("2026-07-27T08:00:00.000Z"),
  });
  const evaluation = createRuleEvaluationLineage({
    evaluationId: "evaluation-1",
    episodeId,
    ruleDefinitionId: "rule-1",
    ruleVersionId: "rule-version-1",
    ruleVersionNumber: 1,
    evaluatedById: nurseId,
    evaluatedAt: new Date("2026-07-27T08:30:00.000Z"),
    outcome: "matched",
    inputHash: "a".repeat(64),
    correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
    sources: [source],
  });
  const lineage = createAlertLineage({
    alertId: "alert-1",
    triggeredAt: new Date("2026-07-27T08:31:00.000Z"),
    evaluationLineage: evaluation,
  });
  return {
    alertId: "alert-1",
    episodeId,
    state: "reviewed" as const,
    triggeredAt: new Date("2026-07-27T08:31:00.000Z"),
    rule: {
      definitionId: "rule-1",
      versionId: "rule-version-1",
      versionNumber: 1,
    },
    evaluation: {
      evaluationId: "evaluation-1",
      episodeId,
      evaluatedById: nurseId,
      evaluatedAt: new Date("2026-07-27T08:30:00.000Z"),
      outcome: "matched" as const,
      inputHash: "a".repeat(64),
      ruleDefinitionId: "rule-1",
      ruleVersionId: "rule-version-1",
      ruleVersionNumber: 1,
    },
    provenance: { status: "VALID" as const, lineage },
    reviews: [
      {
        reviewId: "review-1",
        alertId: "alert-1",
        fromState: "open" as const,
        toState: "reviewed" as const,
        reviewedById: clinicianId,
        reviewedAt: new Date("2026-07-27T09:00:00.000Z"),
      },
    ],
  };
}

function task(alertId: string | null = "alert-1") {
  const createdAt = new Date("2026-07-27T09:15:00.000Z");
  return {
    task: {
      id: alertId ? "task-derived-1" : "task-direct-1",
      episodeId,
      alertId,
      currentState: "open" as const,
      assignedToId: nurseId,
      createdById: nurseId,
      revision: 1,
      resolvedById: null,
      resolvedAt: null,
      createdAt,
    },
    events: [
      {
        id: alertId ? "event-derived-1" : "event-direct-1",
        taskId: alertId ? "task-derived-1" : "task-direct-1",
        type: "created" as const,
        fromState: null,
        toState: "open" as const,
        fromAssignedToId: null,
        toAssignedToId: nurseId,
        actorUserId: nurseId,
        actorRole: "nurse" as const,
        resultingRevision: 1,
        occurredAt: createdAt,
      },
    ],
    currentAssigneeCurrentlyAuthorized: true,
  };
}

function source(overrides: Partial<GovernanceEvidenceSource> = {}): GovernanceEvidenceSource {
  const complete = { returned: 1, limit: 100, truncated: false };
  return {
    episode: {
      id: episodeId,
      state: "ACTIVE",
      version: 2,
      responsibleNurseId: nurseId,
      responsibleClinicianId: clinicianId,
      createdAt: new Date("2026-07-27T07:00:00.000Z"),
      updatedAt: new Date("2026-07-27T09:15:00.000Z"),
      checkInProtocol: {
        versionId: "protocol-v1",
        protocolKey: "synthetic-protocol",
        versionNumber: 1,
      },
    },
    transitions: [
      {
        transitionId: "transition-1",
        fromState: "DRAFT",
        toState: "ACTIVE",
        actorUserId: nurseId,
        actorRole: "nurse",
        resultingVersion: 2,
        occurredAt: new Date("2026-07-27T07:30:00.000Z"),
      },
    ],
    alerts: [alert()],
    tasks: [task()],
    auditEvents: [
      {
        auditEventId: "audit-1",
        action: "TASK_CREATED",
        result: "SUCCESS",
        actorUserId: nurseId,
        actorRole: "nurse",
        resourceType: "Task",
        resourceId: "task-derived-1",
        occurredAt: new Date("2026-07-27T09:15:00.000Z"),
        correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
      },
    ],
    coverage: {
      episodeTransitions: complete,
      alerts: complete,
      alertReviews: complete,
      tasks: complete,
      taskEvents: complete,
      auditEvents: complete,
    },
    ...overrides,
  };
}

describe("EpisodeGovernanceEvidenceView", () => {
  it("referencia episodio y compone EpisodeGovernanceView sin reinterpretarlo", () => {
    const view = projectEpisodeGovernanceEvidence({
      source: source(),
      governance: governance(),
      generatedAt: now,
    });

    expect(view.episode).toMatchObject({ id: episodeId, state: "ACTIVE", version: 2 });
    expect(view.governance).toEqual(governance());
    expect(view.readOnly).toBe(true);
  });

  it("reconstruye una cadena signal-derived completa con provenance V1 y revisión humana", () => {
    const view = projectEpisodeGovernanceEvidence({
      source: source(),
      governance: governance(),
      generatedAt: now,
    });

    expect(view.alerts[0]?.integrity.status).toBe("COMPLETE");
    expect(view.tasks[0]?.signalEvidence.status).toBe("COMPLETE");
    expect(view.tasks[0]?.signalEvidence.alertEvidence?.humanReviews[0]).toMatchObject({
      reviewId: "review-1",
      reviewedById: clinicianId,
    });
    expect(view.alerts[0]?.sourceVerification).toEqual({
      atEvaluation: "SOURCE_REFERENCE_VERIFIED_AT_EVALUATION",
      duringEvidenceRead: "SOURCE_RECORD_NOT_REVERIFIED_DURING_EVIDENCE_READ",
    });
  });

  it("marca la evidencia de señal como NOT_APPLICABLE para una tarea humana directa", () => {
    const view = projectEpisodeGovernanceEvidence({
      source: source({ alerts: [], tasks: [task(null)] }),
      governance: governance(),
      generatedAt: now,
    });

    expect(view.tasks[0]?.signalEvidence.status).toBe("NOT_APPLICABLE");
    expect(view.tasks[0]?.humanAuthorization).toEqual({
      enforcementContract: { status: "NOT_APPLICABLE" },
      perInstanceDecisionPersistence: { status: "NOT_APPLICABLE" },
    });
    expect(view.tasks[0]?.integrity.status).toBe("COMPLETE");
  });

  it("declara la decisión histórica de autorización por instancia como no persistida", () => {
    const view = projectEpisodeGovernanceEvidence({
      source: source(),
      governance: governance(),
      generatedAt: now,
    });

    expect(view.tasks[0]?.humanAuthorization).toEqual({
      enforcementContract: {
        status: "COMPLETE",
        policy: "DefaultHumanAuthorizationPolicy",
        action: "CREATE_TASK_FROM_REVIEWED_ALERT",
      },
      perInstanceDecisionPersistence: {
        status: "UNAVAILABLE",
        limitationCode: "HISTORICAL_HUMAN_AUTHORIZATION_DECISION_NOT_PERSISTED",
      },
    });
    expect(view.integrity.status).toBe("PARTIAL");
  });

  it("no inventa el rol histórico del reviewer", () => {
    const view = projectEpisodeGovernanceEvidence({
      source: source(),
      governance: governance(),
      generatedAt: now,
    });

    expect(view.alerts[0]?.historicalReviewerRole).toEqual({
      status: "UNAVAILABLE",
      limitationCode: "HISTORICAL_REVIEWER_ROLE_NOT_PERSISTED",
    });
    expect(JSON.stringify(view.alerts[0]?.humanReviews)).not.toContain("actorRole");
  });

  it("reutiliza TaskAccountabilityProjection y conserva la revocación posterior", () => {
    const revokedTask = { ...task(), currentAssigneeCurrentlyAuthorized: false };
    const view = projectEpisodeGovernanceEvidence({
      source: source({ tasks: [revokedTask] }),
      governance: governance(),
      generatedAt: now,
    });

    expect(view.tasks[0]?.accountability).toMatchObject({
      consistencyStatus: "VALID",
      currentAssigneeEligibility: "NOT_CURRENTLY_AUTHORIZED",
      blockers: ["CURRENT_ASSIGNEE_NOT_CURRENTLY_AUTHORIZED"],
    });
  });

  it("falla cerrado cuando TaskEvent contradice Task", () => {
    const inconsistent = task();
    inconsistent.task.revision = 2;
    const view = projectEpisodeGovernanceEvidence({
      source: source({ tasks: [inconsistent] }),
      governance: governance(),
      generatedAt: now,
    });

    expect(view.tasks[0]?.accountability.consistencyStatus).toBe("INCONSISTENT");
    expect(view.tasks[0]?.integrity.status).toBe("INCONSISTENT");
    expect(view.integrity.status).toBe("INCONSISTENT");
  });

  it("califica como PARTIAL una historia TaskEvent truncada sin inventar inconsistencia", () => {
    const incomplete = task();
    incomplete.task.revision = 2;
    const input = source({ tasks: [incomplete] });
    const view = projectEpisodeGovernanceEvidence({
      source: {
        ...input,
        coverage: {
          ...input.coverage,
          taskEvents: { returned: 100, limit: 100, truncated: true },
        },
      },
      governance: governance(),
      generatedAt: now,
    });

    expect(view.tasks[0]?.accountability.consistencyStatus).toBe("INCONSISTENT");
    expect(view.tasks[0]?.accountabilityEvidenceStatus).toBe("PARTIAL");
    expect(view.tasks[0]?.integrity.status).toBe("PARTIAL");
    expect(view.tasks[0]?.integrity.issues).not.toContain("TASK_ACCOUNTABILITY_INCONSISTENT");
  });

  it("mantiene INCONSISTENT un CREATION_EVENT_MISMATCH visible aunque exista truncamiento", () => {
    const inconsistent = task();
    inconsistent.task.revision = 2;
    inconsistent.events[0]!.actorUserId = clinicianId;
    const input = source({ tasks: [inconsistent] });
    const view = projectEpisodeGovernanceEvidence({
      source: {
        ...input,
        coverage: {
          ...input.coverage,
          taskEvents: { returned: 100, limit: 100, truncated: true },
        },
      },
      governance: governance(),
      generatedAt: now,
    });

    expect(view.tasks[0]?.accountability.blockers).toContain("CREATION_EVENT_MISMATCH");
    expect(view.tasks[0]?.accountabilityEvidenceStatus).toBe("INCONSISTENT");
    expect(view.tasks[0]?.integrity.status).toBe("INCONSISTENT");
  });

  it("mantiene INCONSISTENT un ASSIGNMENT_CHAIN_MISMATCH visible aunque falte la cola", () => {
    const inconsistent = task();
    inconsistent.task.revision = 3;
    inconsistent.task.assignedToId = clinicianId;
    const reassignment = {
      id: "event-derived-2",
      taskId: "task-derived-1",
      type: "reassigned" as const,
      fromState: "open" as const,
      toState: "open" as const,
      fromAssignedToId: "unexpected-assignee",
      toAssignedToId: clinicianId,
      actorUserId: nurseId,
      actorRole: "nurse" as const,
      resultingRevision: 2,
      occurredAt: new Date("2026-07-27T09:30:00.000Z"),
    };
    const input = source({
      tasks: [{ ...inconsistent, events: [...inconsistent.events, reassignment] }],
    });
    const view = projectEpisodeGovernanceEvidence({
      source: {
        ...input,
        coverage: {
          ...input.coverage,
          taskEvents: { returned: 100, limit: 100, truncated: true },
        },
      },
      governance: governance(),
      generatedAt: now,
    });

    expect(view.tasks[0]?.accountability.blockers).toContain("ASSIGNMENT_CHAIN_MISMATCH");
    expect(view.tasks[0]?.accountabilityEvidenceStatus).toBe("INCONSISTENT");
    expect(view.tasks[0]?.integrity.status).toBe("INCONSISTENT");
  });

  it("falla cerrado cuando falta AlertReview en una tarea signal-derived", () => {
    const withoutReview = { ...alert(), state: "open" as const, reviews: [] };
    const view = projectEpisodeGovernanceEvidence({
      source: source({ alerts: [withoutReview] }),
      governance: governance(),
      generatedAt: now,
    });

    expect(view.tasks[0]?.signalEvidence).toMatchObject({
      status: "INCONSISTENT",
      issues: ["SIGNAL_DERIVED_TASK_REVIEW_MISSING"],
    });
  });

  it("marca provenance inválida o con referencias contradictorias como INCONSISTENT", () => {
    const invalid = {
      ...alert(),
      provenance: { status: "INVALID" as const, reason: "INVALID_OR_UNSUPPORTED_FORMAT" as const },
    };
    const view = projectEpisodeGovernanceEvidence({
      source: source({ alerts: [invalid] }),
      governance: governance(),
      generatedAt: now,
    });

    expect(view.alerts[0]?.integrity).toMatchObject({
      status: "INCONSISTENT",
      issues: expect.arrayContaining(["ALERT_PROVENANCE_INVALID"]),
    });
  });

  it("contrasta hash, actor, tiempos, outcome y versiones persistidas con el lineage", () => {
    const mutations: readonly ((value: ReturnType<typeof alert>) => void)[] = [
      (value) => {
        value.evaluation.inputHash = "b".repeat(64);
      },
      (value) => {
        value.evaluation.evaluatedById = "different-evaluator";
      },
      (value) => {
        value.evaluation.evaluatedAt = new Date("2026-07-27T08:30:01.000Z");
      },
      (value) => {
        (
          value.evaluation as {
            outcome: "matched" | "not-matched" | "abstained";
          }
        ).outcome = "not-matched";
      },
      (value) => {
        value.evaluation.ruleVersionNumber = 2;
      },
      (value) => {
        value.triggeredAt = new Date("2026-07-27T08:31:01.000Z");
      },
    ];

    for (const mutate of mutations) {
      const inconsistent = alert();
      mutate(inconsistent);
      const view = projectEpisodeGovernanceEvidence({
        source: source({ alerts: [inconsistent] }),
        governance: governance(),
        generatedAt: now,
      });
      expect(view.alerts[0]?.integrity).toMatchObject({
        status: "INCONSISTENT",
        issues: expect.arrayContaining(["ALERT_PROVENANCE_REFERENCE_MISMATCH"]),
      });
    }
  });

  it("preserva correlation IDs y rechaza referencias de auditoría ajenas", () => {
    const valid = projectEpisodeGovernanceEvidence({
      source: source(),
      governance: governance(),
      generatedAt: now,
    });
    expect(valid.auditReferences[0]?.correlationId).toBe("018f673a-4e35-7060-99b5-7bc6feba3a97");

    const foreignAudit = {
      ...source().auditEvents[0]!,
      resourceId: "task-other-episode",
    };
    const invalid = projectEpisodeGovernanceEvidence({
      source: source({ auditEvents: [foreignAudit] }),
      governance: governance(),
      generatedAt: now,
    });
    expect(invalid.integrity).toMatchObject({
      status: "INCONSISTENT",
      issues: expect.arrayContaining(["AUDIT_REFERENCE_MISMATCH"]),
    });
  });

  it("declara como PARTIAL cualquier truncamiento de consulta", () => {
    const truncated = source();
    const view = projectEpisodeGovernanceEvidence({
      source: {
        ...truncated,
        coverage: {
          ...truncated.coverage,
          auditEvents: { returned: 100, limit: 100, truncated: true },
        },
      },
      governance: governance(),
      generatedAt: now,
    });

    expect(view.coverage.auditEvents.status).toBe("PARTIAL");
    expect(view.integrity.issues).toContain("COLLECTION_TRUNCATED");
  });

  it("no copia payload clínico y no muta las fuentes", () => {
    const input = source();
    const before = JSON.stringify(input);
    const view = projectEpisodeGovernanceEvidence({
      source: input,
      governance: governance(),
      generatedAt: now,
    });
    const serialized = JSON.stringify(view);

    expect(JSON.stringify(input)).toBe(before);
    expect(serialized).not.toContain('"inputHash"');
    expect(serialized).not.toContain("a".repeat(64));
    for (const prohibited of [
      "answers",
      "explanation",
      "summary",
      "note",
      "resolutionReason",
      "caregiver text",
      "safety plan content",
      "home safety content",
    ]) {
      expect(serialized).not.toContain(prohibited);
    }
  });
});
