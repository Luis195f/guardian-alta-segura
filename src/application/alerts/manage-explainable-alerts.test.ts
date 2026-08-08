import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  ActivateRuleVersionService,
  ApproveRuleVersionService,
  CreateRuleVersionService,
  EvaluateRuleService,
  ExplainableAlertConflictError,
  ExplainableAlertDeniedError,
  ExplainableAlertInvalidError,
  ReviewAlertService,
} from "@/application/alerts/manage-explainable-alerts";
import type {
  ExplainableAlertsTransaction,
  ExplainableAlertsUnitOfWork,
  RecordedAlertReview,
  RecordedEvaluation,
  RuleVersionRecord,
} from "@/application/ports/explainable-alerts-unit-of-work";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import { SYNTHETIC_RULE_FIXTURES } from "@/domain/alerts/synthetic-rule-fixtures";
import {
  attachRuleObservationToVerifiedSource,
  mapCheckInNonResponseProvenance,
  mapRuleInputSourceClaim,
} from "@/domain/provenance/signal-provenance";

function principal(userId: string, roles: AuthenticatedPrincipal["roles"]): AuthenticatedPrincipal {
  return { userId, roles, sessionId: randomUUID() };
}

const fixture = SYNTHETIC_RULE_FIXTURES[2]!;
const draftVersion: RuleVersionRecord = {
  id: "rule-version-v1",
  definitionId: "rule-definition-1",
  versionNumber: 1,
  state: "draft",
  basedOnVersionId: null,
  dsl: fixture.dsl,
  createdById: "admin-1",
  approval: null,
};
const activeVersion: RuleVersionRecord = {
  ...draftVersion,
  state: "active",
  approval: {
    id: "approval-1",
    approvedById: "clinician-1",
    approvedAt: new Date("2026-07-17T09:00:00.000Z"),
  },
};

function transaction(
  overrides: Partial<ExplainableAlertsTransaction> = {},
): ExplainableAlertsTransaction {
  return {
    isActiveUserWithRole: async () => true,
    findDefinitionByKey: async () => ({
      id: "rule-definition-1",
      ruleKey: fixture.ruleKey,
      name: fixture.name,
      isSyntheticFixture: true,
    }),
    createDefinition: async (input) => ({ id: "rule-definition-1", ...input }),
    getLatestVersion: async () => draftVersion,
    getVersion: async () => draftVersion,
    createVersion: async (input) => ({
      ...draftVersion,
      id: "rule-version-v2",
      versionNumber: input.versionNumber,
      basedOnVersionId: input.basedOnVersionId,
      dsl: input.dsl,
      createdById: input.createdById,
    }),
    approveVersion: async (input) => ({
      ...draftVersion,
      state: "approved",
      approval: {
        id: "approval-1",
        approvedById: input.approvedById,
        approvedAt: input.approvedAt,
      },
    }),
    activateVersion: async () => activeVersion,
    getEpisode: async () => ({
      id: "episode-1",
      isSynthetic: true,
      responsibleNurseId: "nurse-1",
      responsibleClinicianId: "clinician-1",
    }),
    resolveSourceProvenance: async (inputs, episodeId) =>
      inputs.map((input) => {
        const claim = mapRuleInputSourceClaim(input, episodeId);
        if (claim.kind !== "CHECK_IN_NON_RESPONSE") {
          throw new Error("Unsupported synthetic source in unit test");
        }
        return attachRuleObservationToVerifiedSource(
          input,
          episodeId,
          mapCheckInNonResponseProvenance({
            nonResponseEventId: claim.resource.resourceId,
            assignmentId: "assignment-1",
            outcomeId: "outcome-1",
            episodeId,
            protocolVersionId: "protocol-version-1",
            protocolVersionNumber: 1,
            outcomeType: "EXPIRED",
            recordedById: "nurse-1",
            recordedAt: new Date("2026-07-17T08:00:00.000Z"),
          }),
        );
      }),
    findEvaluationByIdempotency: async () => null,
    recordEvaluation: async (input) => ({
      evaluationId: "evaluation-1",
      alertId: input.alert ? "alert-1" : null,
      created: true,
      evaluatedById: input.evaluatedById,
      ruleVersionId: input.ruleVersionId,
      episodeId: input.episodeId,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint: input.requestFingerprint,
      outcome: input.outcome,
      missingInputs: input.missingInputs,
    }),
    getAlert: async () => ({
      id: "alert-1",
      episodeId: "episode-1",
      currentState: "open",
      responsibleNurseId: "nurse-1",
      responsibleClinicianId: "clinician-1",
    }),
    findAlertReviewByIdempotency: async () => null,
    appendAlertReview: async (input) => ({
      reviewId: "review-1",
      alertId: input.alertId,
      fromState: input.fromState,
      toState: input.toState,
      reviewedById: input.reviewedById,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint: input.requestFingerprint,
      created: true,
    }),
    appendAuditEvent: async () => ({ id: "audit-1" }),
    ...overrides,
  };
}

function unitOfWork(tx: ExplainableAlertsTransaction): ExplainableAlertsUnitOfWork {
  return { run: (operation) => operation(tx) };
}

describe("explainable alert application services", () => {
  it("versiona en draft sin sobrescribir la versión anterior", async () => {
    const createVersion = vi.fn(transaction().createVersion);
    const result = await new CreateRuleVersionService(
      unitOfWork(transaction({ createVersion })),
    ).execute({
      actor: principal("admin-1", ["admin"]),
      ruleKey: fixture.ruleKey,
      name: fixture.name,
      basedOnVersionId: draftVersion.id,
      dsl: { ...fixture.dsl, window: { lookbackHours: 96 } },
      correlationId: randomUUID(),
    });
    expect(result).toMatchObject({ ruleVersionId: "rule-version-v2", versionNumber: 2 });
    expect(createVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        versionNumber: 2,
        state: "draft",
        basedOnVersionId: draftVersion.id,
      }),
    );
    expect(draftVersion.dsl.window.lookbackHours).toBe(72);
  });

  it("no permite renombrar silenciosamente una definición al versionarla", async () => {
    const createVersion = vi.fn(transaction().createVersion);
    await expect(
      new CreateRuleVersionService(unitOfWork(transaction({ createVersion }))).execute({
        actor: principal("admin-1", ["admin"]),
        ruleKey: fixture.ruleKey,
        name: "Otro nombre sintético incompatible",
        basedOnVersionId: draftVersion.id,
        dsl: fixture.dsl,
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(ExplainableAlertConflictError);
    expect(createVersion).not.toHaveBeenCalled();
  });

  it("separa permisos: clinician aprueba y admin activa", async () => {
    await expect(
      new ApproveRuleVersionService(unitOfWork(transaction())).execute({
        actor: principal("admin-1", ["admin"]),
        ruleVersionId: draftVersion.id,
        approvalReference: "SYNTHETIC-LOCAL-TEST",
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(ExplainableAlertDeniedError);

    await expect(
      new ActivateRuleVersionService(
        unitOfWork(
          transaction({
            getVersion: async () => ({
              ...draftVersion,
              state: "approved",
              approval: activeVersion.approval,
            }),
          }),
        ),
      ).execute({
        actor: principal("clinician-1", ["clinician"]),
        ruleVersionId: draftVersion.id,
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(ExplainableAlertDeniedError);
  });

  it("una regla no aprobada y no activa no ejecuta ni persiste evaluación", async () => {
    const recordEvaluation = vi.fn(transaction().recordEvaluation);
    await expect(
      new EvaluateRuleService(unitOfWork(transaction({ recordEvaluation }))).execute({
        actor: principal("nurse-1", ["nurse"]),
        ruleVersionId: draftVersion.id,
        episodeId: "episode-1",
        inputs: [],
        idempotencyKey: "alert:draft-test",
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(ExplainableAlertConflictError);
    expect(recordEvaluation).not.toHaveBeenCalled();
  });

  it("persiste evaluación y aviso reproducibles sin crear acción clínica", async () => {
    const recordEvaluation = vi.fn(transaction().recordEvaluation);
    const appendAlertReview = vi.fn(transaction().appendAlertReview);
    const tx = transaction({
      getVersion: async () => activeVersion,
      recordEvaluation,
      appendAlertReview,
    });
    const result = await new EvaluateRuleService(unitOfWork(tx)).execute({
      actor: principal("nurse-1", ["nurse"]),
      ruleVersionId: activeVersion.id,
      episodeId: "episode-1",
      inputs: [
        {
          inputKey: "non_response_hours",
          value: 48,
          observedAt: "2026-07-17T08:00:00.000Z",
          source: {
            resourceType: "NonResponseEvent",
            resourceId: "synthetic-non-response-1",
            field: "elapsedHours",
            episodeId: "episode-1",
          },
        },
      ],
      idempotencyKey: "alert:matched-test",
      correlationId: randomUUID(),
      evaluatedAt: new Date("2026-07-17T12:00:00.000Z"),
    });
    expect(result).toMatchObject({ outcome: "matched", alertId: "alert-1" });
    expect(recordEvaluation).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleVersionNumber: 1,
        outcome: "matched",
        alert: expect.objectContaining({
          explanation: expect.stringContaining("NonResponseEvent/synthetic-non-response-1"),
        }),
      }),
    );
    expect(appendAlertReview).not.toHaveBeenCalled();
  });

  it("persiste ABSTAINED ante un dato requerido ausente sin crear aviso ni acción", async () => {
    const recordEvaluation = vi.fn(transaction().recordEvaluation);
    const appendAlertReview = vi.fn(transaction().appendAlertReview);
    const result = await new EvaluateRuleService(
      unitOfWork(
        transaction({
          getVersion: async () => activeVersion,
          recordEvaluation,
          appendAlertReview,
        }),
      ),
    ).execute({
      actor: principal("nurse-1", ["nurse"]),
      ruleVersionId: activeVersion.id,
      episodeId: "episode-1",
      inputs: [],
      idempotencyKey: "alert:abstained-test",
      correlationId: randomUUID(),
      evaluatedAt: new Date("2026-07-17T12:00:00.000Z"),
    });

    expect(result).toMatchObject({
      outcome: "abstained",
      alertId: null,
      missingInputs: ["non_response_hours"],
    });
    expect(recordEvaluation).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "abstained", alert: null }),
    );
    expect(appendAlertReview).not.toHaveBeenCalled();
  });

  it("reutiliza una evaluación por clave idempotente y rechaza otro payload", async () => {
    let saved: RecordedEvaluation | null = null;
    const appendAuditEvent = vi.fn(transaction().appendAuditEvent);
    const tx = transaction({
      getVersion: async () => activeVersion,
      findEvaluationByIdempotency: async () => saved,
      recordEvaluation: async (input) => {
        saved = {
          evaluationId: "evaluation-idempotent",
          alertId: "alert-idempotent",
          created: true,
          evaluatedById: input.evaluatedById,
          ruleVersionId: input.ruleVersionId,
          episodeId: input.episodeId,
          idempotencyKey: input.idempotencyKey,
          requestFingerprint: input.requestFingerprint,
          outcome: input.outcome,
          missingInputs: input.missingInputs,
        };
        return saved;
      },
      appendAuditEvent,
    });
    const service = new EvaluateRuleService(unitOfWork(tx));
    const request = {
      actor: principal("nurse-1", ["nurse"]),
      ruleVersionId: activeVersion.id,
      episodeId: "episode-1",
      inputs: [
        {
          inputKey: "non_response_hours",
          value: 48,
          observedAt: "2026-07-17T08:00:00.000Z",
          source: {
            resourceType: "NonResponseEvent",
            resourceId: "synthetic-idempotent-source",
            field: "elapsedHours",
            episodeId: "episode-1",
          },
        },
      ],
      idempotencyKey: "alert:idempotent-test",
      correlationId: randomUUID(),
    } as const;

    const first = await service.execute({
      ...request,
      evaluatedAt: new Date("2026-07-17T12:00:00.000Z"),
    });
    const retry = await service.execute({
      ...request,
      evaluatedAt: new Date("2026-07-17T12:05:00.000Z"),
    });
    expect(first).toMatchObject({ idempotent: false, evaluationId: "evaluation-idempotent" });
    expect(retry).toMatchObject({ idempotent: true, evaluationId: "evaluation-idempotent" });
    expect(appendAuditEvent.mock.calls.map(([event]) => event.action)).toEqual([
      "RULE_EVALUATED",
      "ALERT_CREATED",
    ]);

    await expect(
      service.execute({
        ...request,
        inputs: [{ ...request.inputs[0], value: 47 }],
      }),
    ).rejects.toBeInstanceOf(ExplainableAlertConflictError);
  });

  it("rechaza procedencia desconocida antes de persistir evaluación o aviso", async () => {
    const recordEvaluation = vi.fn(transaction().recordEvaluation);
    await expect(
      new EvaluateRuleService(
        unitOfWork(transaction({ getVersion: async () => activeVersion, recordEvaluation })),
      ).execute({
        actor: principal("nurse-1", ["nurse"]),
        ruleVersionId: activeVersion.id,
        episodeId: "episode-1",
        inputs: [
          {
            inputKey: "non_response_hours",
            value: 48,
            observedAt: "2026-07-17T08:00:00.000Z",
            source: {
              resourceType: "UnknownSource",
              resourceId: "unknown-source-1",
              field: "elapsedHours",
              episodeId: "episode-1",
            },
          },
        ],
        idempotencyKey: "alert:unknown-source",
        correlationId: randomUUID(),
        evaluatedAt: new Date("2026-07-17T12:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(ExplainableAlertInvalidError);
    expect(recordEvaluation).not.toHaveBeenCalled();
  });

  it("solo la revisión humana explícita cambia el estado del aviso", async () => {
    const appendAlertReview = vi.fn(transaction().appendAlertReview);
    const result = await new ReviewAlertService(
      unitOfWork(transaction({ appendAlertReview })),
    ).execute({
      actor: principal("nurse-1", ["nurse"]),
      alertId: "alert-1",
      expectedState: "open",
      nextState: "reviewed",
      idempotencyKey: "alert-review:explicit",
      correlationId: randomUUID(),
    });
    expect(result.state).toBe("reviewed");
    expect(appendAlertReview).toHaveBeenCalledWith(
      expect.objectContaining({
        fromState: "open",
        toState: "reviewed",
        reviewedById: "nurse-1",
        idempotencyKey: "alert-review:explicit",
        requestFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
  });

  it("reutiliza una revisión por clave idempotente, no duplica auditoría y rechaza otra huella", async () => {
    let saved: RecordedAlertReview | null = null;
    const appendAuditEvent = vi.fn(transaction().appendAuditEvent);
    const tx = transaction({
      findAlertReviewByIdempotency: async () => saved,
      appendAlertReview: async (input) => {
        saved = {
          reviewId: "review-idempotent",
          alertId: input.alertId,
          fromState: input.fromState,
          toState: input.toState,
          reviewedById: input.reviewedById,
          idempotencyKey: input.idempotencyKey,
          requestFingerprint: input.requestFingerprint,
          created: true,
        };
        return saved;
      },
      appendAuditEvent,
    });
    const service = new ReviewAlertService(unitOfWork(tx));
    const request = {
      actor: principal("nurse-1", ["nurse"]),
      alertId: "alert-1",
      expectedState: "open",
      nextState: "reviewed",
      idempotencyKey: "alert-review:replay",
      correlationId: randomUUID(),
    } as const;

    await expect(service.execute(request)).resolves.toMatchObject({
      reviewId: "review-idempotent",
      idempotent: false,
    });
    await expect(service.execute(request)).resolves.toMatchObject({
      reviewId: "review-idempotent",
      idempotent: true,
    });
    expect(appendAuditEvent).toHaveBeenCalledOnce();

    await expect(
      service.execute({ ...request, nextState: "dismissed-with-reason", reason: "Otro motivo" }),
    ).rejects.toBeInstanceOf(ExplainableAlertConflictError);
  });

  it("exige clave idempotente y motivo al descartar", async () => {
    const appendAlertReview = vi.fn(transaction().appendAlertReview);
    const service = new ReviewAlertService(unitOfWork(transaction({ appendAlertReview })));
    await expect(
      service.execute({
        actor: principal("nurse-1", ["nurse"]),
        alertId: "alert-1",
        expectedState: "open",
        nextState: "reviewed",
        idempotencyKey: "",
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(ExplainableAlertInvalidError);
    await expect(
      service.execute({
        actor: principal("nurse-1", ["nurse"]),
        alertId: "alert-1",
        expectedState: "open",
        nextState: "dismissed-with-reason",
        idempotencyKey: "alert-review:dismiss",
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(ExplainableAlertInvalidError);
    expect(appendAlertReview).not.toHaveBeenCalled();
  });

  it("deniega patient, caregiver, support y profesionales ajenos al episodio", async () => {
    const appendAlertReview = vi.fn(transaction().appendAlertReview);
    const service = new ReviewAlertService(unitOfWork(transaction({ appendAlertReview })));
    for (const role of ["patient", "caregiver", "support"] as const) {
      await expect(
        service.execute({
          actor: principal(`${role}-1`, [role]),
          alertId: "alert-1",
          expectedState: "open",
          nextState: "reviewed",
          idempotencyKey: `alert-review:${role}`,
          correlationId: randomUUID(),
        }),
      ).rejects.toBeInstanceOf(ExplainableAlertDeniedError);
    }
    for (const role of ["nurse", "clinician"] as const) {
      await expect(
        service.execute({
          actor: principal(`${role}-other`, [role]),
          alertId: "alert-1",
          expectedState: "open",
          nextState: "reviewed",
          idempotencyKey: `alert-review:${role}-other`,
          correlationId: randomUUID(),
        }),
      ).rejects.toBeInstanceOf(ExplainableAlertDeniedError);
    }
    expect(appendAlertReview).not.toHaveBeenCalled();
  });
});
