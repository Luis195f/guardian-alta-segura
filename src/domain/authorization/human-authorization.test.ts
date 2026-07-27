import { describe, expect, it } from "vitest";

import { DefaultHumanAuthorizationPolicy } from "@/domain/authorization/human-authorization";

const evaluatedAt = new Date("2026-07-26T10:00:00.000Z");
const reviewedAt = new Date("2026-07-26T09:00:00.000Z");

function validInput() {
  return {
    action: "CREATE_TASK_FROM_REVIEWED_ALERT",
    actor: {
      userId: "nurse-1",
      roles: ["nurse"],
      sessionId: "session-1",
    },
    activeRole: "nurse",
    episode: {
      id: "episode-1",
      responsibleNurseId: "nurse-1",
      responsibleClinicianId: "clinician-1",
    },
    alert: {
      id: "alert-1",
      episodeId: "episode-1",
      state: "reviewed",
      ruleVersionId: "rule-version-1",
      ruleVersionNumber: 3,
      explanation: "CLINICAL-CONTENT-MUST-NOT-BE-COPIED",
    },
    review: {
      id: "review-1",
      alertId: "alert-1",
      reviewedById: "clinician-1",
      reviewedAt,
      freeText: "REVIEW-TEXT-MUST-NOT-BE-COPIED",
    },
    evaluatedAt,
  } as const;
}

describe("DefaultHumanAuthorizationPolicy", () => {
  const policy = new DefaultHumanAuthorizationPolicy();

  it("autoriza una tarea desde un aviso revisado para el actor actualmente autorizado", () => {
    const decision = policy.evaluate(validInput());
    expect(decision).toMatchObject({
      status: "AUTHORIZED",
      action: "CREATE_TASK_FROM_REVIEWED_ALERT",
      episodeId: "episode-1",
      actorId: "nurse-1",
      blockers: [],
      evidence: {
        reviewedObject: {
          resourceType: "Alert",
          resourceId: "alert-1",
          ruleVersion: { resourceId: "rule-version-1", versionNumber: 3 },
        },
        humanReview: {
          resourceType: "AlertReview",
          resourceId: "review-1",
          reviewerId: "clinician-1",
        },
      },
    });
  });

  it("deniega un aviso sin revisión humana", () => {
    expect(policy.evaluate({ ...validInput(), review: null })).toMatchObject({
      status: "NOT_AUTHORIZED",
      blockers: ["NO_HUMAN_REVIEW"],
      evidence: null,
    });
  });

  it("deniega un aviso inexistente", () => {
    expect(policy.evaluate({ ...validInput(), alert: null, review: null })).toMatchObject({
      status: "NOT_AUTHORIZED",
      blockers: ["ALERT_NOT_FOUND"],
    });
  });

  it("deniega una revisión perteneciente a otro aviso", () => {
    expect(
      policy.evaluate({
        ...validInput(),
        review: { ...validInput().review, alertId: "alert-other" },
      }),
    ).toMatchObject({
      status: "NOT_AUTHORIZED",
      blockers: ["INVALID_REVIEW_EVIDENCE"],
      evidence: null,
    });
  });

  it("deniega una revisión posterior al instante de evaluación", () => {
    expect(
      policy.evaluate({
        ...validInput(),
        review: {
          ...validInput().review,
          reviewedAt: new Date("2026-07-26T10:00:00.001Z"),
        },
      }),
    ).toMatchObject({
      status: "NOT_AUTHORIZED",
      blockers: ["INVALID_REVIEW_EVIDENCE"],
      evidence: null,
    });
  });

  it("deniega un aviso perteneciente a otro episodio", () => {
    expect(
      policy.evaluate({
        ...validInput(),
        alert: { ...validInput().alert, episodeId: "episode-other" },
      }),
    ).toMatchObject({
      status: "NOT_AUTHORIZED",
      blockers: ["ALERT_EPISODE_MISMATCH"],
    });
  });

  it("deniega a un actor sin rol permitido o con el rol revocado", () => {
    expect(policy.evaluate({ ...validInput(), activeRole: null })).toMatchObject({
      status: "NOT_AUTHORIZED",
      blockers: ["ACTOR_NOT_AUTHORIZED"],
    });
  });

  it.each(["admin", "patient", "caregiver", "support"])(
    "deniega por defecto el rol no profesional %s",
    (role) => {
      expect(
        policy.evaluate({
          ...validInput(),
          actor: { userId: "nurse-1", roles: [role], sessionId: "session-1" },
          activeRole: null,
        }),
      ).toMatchObject({
        status: "NOT_AUTHORIZED",
        blockers: ["ACTOR_NOT_AUTHORIZED"],
      });
    },
  );

  it("deniega cuando no existe principal autenticado", () => {
    expect(policy.evaluate({ ...validInput(), actor: null, activeRole: null })).toMatchObject({
      status: "NOT_AUTHORIZED",
      blockers: expect.arrayContaining(["ACTOR_NOT_AUTHENTICATED", "ACTOR_NOT_AUTHORIZED"]),
    });
  });

  it("deniega a un actor fuera de la responsabilidad del episodio", () => {
    expect(
      policy.evaluate({
        ...validInput(),
        actor: { userId: "nurse-other", roles: ["nurse"], sessionId: "session-other" },
      }),
    ).toMatchObject({
      status: "NOT_AUTHORIZED",
      blockers: ["ACTOR_NOT_RESPONSIBLE"],
    });
  });

  it("deniega una acción no soportada", () => {
    expect(policy.evaluate({ ...validInput(), action: "CLOSE_EPISODE" })).toMatchObject({
      status: "NOT_AUTHORIZED",
      action: "UNSUPPORTED",
      blockers: ["UNSUPPORTED_ACTION"],
    });
  });

  it("falla cerrado ante evidencia malformed", () => {
    expect(policy.evaluate({ ...validInput(), review: { id: "review-1" } })).toMatchObject({
      status: "NOT_AUTHORIZED",
      blockers: ["INVALID_REVIEW_EVIDENCE"],
    });
    expect(policy.evaluate(null)).toMatchObject({
      status: "NOT_AUTHORIZED",
      blockers: ["POLICY_EVALUATION_ERROR"],
    });
    expect(policy.evaluate({ ...validInput(), evaluatedAt: "not-a-date" })).toMatchObject({
      status: "NOT_AUTHORIZED",
      blockers: ["POLICY_EVALUATION_ERROR"],
    });
  });

  it("es una evaluación pura y no ejecuta mutaciones", () => {
    const input = validInput();
    const before = structuredClone(input);
    policy.evaluate(input);
    expect(input).toEqual(before);
    expect(policy).not.toHaveProperty("createTask");
    expect(policy).not.toHaveProperty("appendReview");
  });

  it("no copia explicación, resumen ni texto libre en la evidencia", () => {
    const serialized = JSON.stringify(policy.evaluate(validInput()));
    expect(serialized).not.toMatch(/CLINICAL-CONTENT|REVIEW-TEXT|explanation|freeText|summary/);
  });

  it("distingue reviewer histórico y acting actor", () => {
    const decision = policy.evaluate(validInput());
    expect(decision.actorId).toBe("nurse-1");
    expect(decision.evidence?.humanReview.reviewerId).toBe("clinician-1");
  });

  it("declara que el rol histórico del reviewer no está persistido de forma fiable", () => {
    const decision = policy.evaluate(validInput());
    expect(decision.evidence?.humanReview.historicalReviewerRoleEvidence).toBe(
      "HISTORICAL_REVIEWER_ROLE_NOT_PERSISTED",
    );
    expect(decision.evidence?.humanReview).not.toHaveProperty("reviewerRole");
  });

  it("no usa actioned como prueba de que una Task exista", () => {
    const decision = policy.evaluate({
      ...validInput(),
      alert: { ...validInput().alert, state: "actioned" },
    });
    expect(decision.status).toBe("AUTHORIZED");
    expect(decision.evidence).not.toHaveProperty("task");
    expect(JSON.stringify(decision)).not.toContain("TaskEvent");
  });
});
