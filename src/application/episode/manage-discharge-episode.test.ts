import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  CreateDischargeEpisodeService,
  EpisodeClosureBlockedError,
  EpisodeConcurrencyConflictError,
  EpisodeDeniedError,
  EpisodeIdentityNotVerifiedError,
  EpisodeResponsibleProfessionalsError,
  GetEpisodeGovernanceViewService,
  TransitionDischargeEpisodeService,
} from "@/application/episode/manage-discharge-episode";
import type {
  EpisodeRecord,
  EpisodeTransaction,
  EpisodeUnitOfWork,
  IdempotentEpisodeTransition,
} from "@/application/ports/episode-unit-of-work";
import type { NewAuditEvent } from "@/domain/audit/audit-event";
import type { Role } from "@/domain/auth/role";
import {
  PendingInstitutionalEpisodeGovernancePolicy,
  type EpisodeGovernancePolicy,
} from "@/domain/episode/activation-policy";
import type {
  EpisodeActorRole,
  EpisodeStatus,
  ProgramLengthDays,
} from "@/domain/episode/discharge-episode";

const pendingGovernance = new PendingInstitutionalEpisodeGovernancePolicy();

class MemoryEpisodeStore implements EpisodeTransaction, EpisodeUnitOfWork {
  readonly activeRoles = new Map<string, Set<Role>>([
    ["nurse-1", new Set(["nurse"])],
    ["clinician-1", new Set(["clinician"])],
  ]);
  readonly transitions: IdempotentEpisodeTransition[] = [];
  readonly transitionInputs: Array<{
    episodeId: string;
    fromStatus: EpisodeStatus | null;
    toStatus: EpisodeStatus;
    actorUserId: string;
    actorRole: EpisodeActorRole;
    reason: string | null;
    idempotencyKey: string;
    requestFingerprint: string;
    resultingVersion: number;
    occurredAt: Date;
  }> = [];
  readonly audits: NewAuditEvent[] = [];
  patient = { id: "patient-1", isSynthetic: true };
  episode: EpisodeRecord | null = null;
  forceConcurrencyConflict = false;
  identityVerified = true;
  openObligations: Awaited<
    ReturnType<EpisodeTransaction["getEpisodeGovernanceFacts"]>
  >["openObligations"] = [];

  run<T>(operation: (transaction: EpisodeTransaction) => Promise<T>): Promise<T> {
    return operation(this);
  }

  async isActiveUserWithRole(userId: string, role: Role): Promise<boolean> {
    return this.activeRoles.get(userId)?.has(role) ?? false;
  }

  async findPatientByExternalId(externalPseudonymousId: string) {
    return externalPseudonymousId === "SYNTH-PATIENT-001" ? this.patient : null;
  }

  async isSyntheticDemoCheckInProtocol(protocolVersionId: string) {
    return protocolVersionId === "check-in-protocol-v1";
  }

  async createEpisode(input: {
    patientId: string;
    dischargeDate: Date;
    programLengthDays: ProgramLengthDays;
    responsibleNurseId: string;
    responsibleClinicianId: string;
    createdById: string;
    checkInProtocolVersionId: string;
  }): Promise<EpisodeRecord> {
    void input.createdById;
    this.episode = {
      id: "episode-1",
      patientId: input.patientId,
      dischargeDate: input.dischargeDate,
      programLengthDays: input.programLengthDays,
      responsibleNurseId: input.responsibleNurseId,
      responsibleClinicianId: input.responsibleClinicianId,
      status: "DRAFT",
      version: 1,
      checkInProtocolVersionId: input.checkInProtocolVersionId,
      identity: this.identityContext(),
    };
    return this.episode;
  }

  async getEpisodeForTransition(): Promise<EpisodeRecord | null> {
    if (!this.episode) return null;
    return { ...this.episode, identity: this.identityContext() };
  }

  async getEpisodeGovernanceFacts() {
    return {
      responsibleProfessionals: {
        nurseActive: this.activeRoles.get("nurse-1")?.has("nurse") ?? false,
        clinicianActive: this.activeRoles.get("clinician-1")?.has("clinician") ?? false,
      },
      checkInProtocol: {
        versionId: "check-in-protocol-v1",
        protocolKey: "synthetic-check-in",
        versionNumber: 1,
        state: "SYNTHETIC_DEMO" as const,
        isSyntheticFixture: true,
      },
      openObligations: this.openObligations,
    };
  }

  async findIdempotentTransition(actorUserId: string, idempotencyKey: string) {
    const index = this.transitionInputs.findIndex(
      (item) => item.actorUserId === actorUserId && item.idempotencyKey === idempotencyKey,
    );
    return index < 0 ? null : (this.transitions[index] ?? null);
  }

  async updateEpisodeStatus(input: {
    episodeId: string;
    fromStatus: EpisodeStatus;
    toStatus: EpisodeStatus;
    expectedVersion: number;
    actorUserId: string;
    closedReason: string | null;
    occurredAt: Date;
  }): Promise<boolean> {
    void input.actorUserId;
    void input.closedReason;
    void input.occurredAt;
    if (
      this.forceConcurrencyConflict ||
      !this.episode ||
      this.episode.id !== input.episodeId ||
      this.episode.status !== input.fromStatus ||
      this.episode.version !== input.expectedVersion
    ) {
      return false;
    }
    this.episode = {
      ...this.episode,
      status: input.toStatus,
      version: input.expectedVersion + 1,
    };
    return true;
  }

  async createTransition(input: {
    episodeId: string;
    fromStatus: EpisodeStatus | null;
    toStatus: EpisodeStatus;
    actorUserId: string;
    actorRole: EpisodeActorRole;
    reason: string | null;
    idempotencyKey: string;
    requestFingerprint: string;
    resultingVersion: number;
    occurredAt: Date;
  }) {
    this.transitionInputs.push(input);
    this.transitions.push({
      episodeId: input.episodeId,
      requestFingerprint: input.requestFingerprint,
      toStatus: input.toStatus,
      resultingVersion: input.resultingVersion,
    });
    return { id: `transition-${this.transitions.length}` };
  }

  async appendAuditEvent(input: NewAuditEvent) {
    this.audits.push(input);
    return { id: `audit-${this.audits.length}` };
  }

  seedDraft(identityVerified = true): void {
    this.identityVerified = identityVerified;
    this.episode = {
      id: "episode-1",
      patientId: "patient-1",
      dischargeDate: new Date("2026-07-16T00:00:00Z"),
      programLengthDays: 30,
      responsibleNurseId: "nurse-1",
      responsibleClinicianId: "clinician-1",
      status: "DRAFT",
      version: 1,
      checkInProtocolVersionId: "check-in-protocol-v1",
      identity: this.identityContext(),
    };
  }

  private identityContext() {
    return {
      patientIsSynthetic: true,
      patientState: this.identityVerified ? ("VERIFIED" as const) : ("PENDING" as const),
      policyVersionId: "identity-policy-v1",
      policyKey: "synthetic-identity-policy",
      policyVersion: "demo-v1",
      policyState: "APPROVED" as const,
      acceptedState: "VERIFIED" as const,
      processCode: "RECORDED_HUMAN_REVIEW",
      processVersion: "demo-v1",
      policyIsSyntheticDemo: true,
      identityVerifiedAt: new Date("2026-07-16T08:00:00Z"),
      identityVerifiedById: "nurse-1",
    };
  }
}

function principal(userId: string, roles: readonly Role[]) {
  return { userId, roles, sessionId: randomUUID() };
}

function createInput(store: MemoryEpisodeStore, actor = principal("nurse-1", ["nurse"])) {
  return new CreateDischargeEpisodeService(store).execute({
    actor,
    externalPseudonymousId: "SYNTH-PATIENT-001",
    dischargeDate: "2026-07-16",
    programLengthDays: 30,
    responsibleNurseId: "nurse-1",
    responsibleClinicianId: "clinician-1",
    checkInProtocolVersionId: "check-in-protocol-v1",
    idempotencyKey: "create:episode-001",
    correlationId: randomUUID(),
  });
}

function activate(store: MemoryEpisodeStore, idempotencyKey = "activate:episode-001") {
  return new TransitionDischargeEpisodeService(store, pendingGovernance).execute({
    actor: principal("nurse-1", ["nurse"]),
    episodeId: "episode-1",
    targetStatus: "ACTIVE",
    expectedVersion: 1,
    idempotencyKey,
    correlationId: randomUUID(),
  });
}

describe("discharge episode application service", () => {
  it.each([["admin"], ["patient"], ["caregiver"], ["support"]] as const)(
    "deniega crear a %s",
    async (role) => {
      const store = new MemoryEpisodeStore();
      store.activeRoles.set(`actor-${role}`, new Set([role]));
      await expect(createInput(store, principal(`actor-${role}`, [role]))).rejects.toBeInstanceOf(
        EpisodeDeniedError,
      );
    },
  );

  it.each([
    ["nurse", "nurse-1"],
    ["clinician", "clinician-1"],
  ] as const)("permite crear a %s con responsables activos", async (role, actorId) => {
    const store = new MemoryEpisodeStore();
    await expect(createInput(store, principal(actorId, [role]))).resolves.toMatchObject({
      episodeId: "episode-1",
      version: 1,
    });
  });

  it("deniega si falta un profesional responsable activo", async () => {
    const store = new MemoryEpisodeStore();
    store.activeRoles.delete("clinician-1");
    await expect(createInput(store)).rejects.toBeInstanceOf(EpisodeResponsibleProfessionalsError);
  });

  it("activa con identidad y responsables verificados", async () => {
    const store = new MemoryEpisodeStore();
    store.seedDraft();
    await expect(activate(store)).resolves.toMatchObject({ version: 2, idempotent: false });
    expect(store.episode?.status).toBe("ACTIVE");
  });

  it("deniega activar sin identidad verificada por política", async () => {
    const store = new MemoryEpisodeStore();
    store.seedDraft(false);
    await expect(activate(store)).rejects.toBeInstanceOf(EpisodeIdentityNotVerifiedError);
  });

  it("hace idempotente la activación y no duplica transición ni auditoría", async () => {
    const store = new MemoryEpisodeStore();
    store.seedDraft();
    const first = await activate(store);
    const second = await activate(store);
    expect(first.idempotent).toBe(false);
    expect(second).toEqual({ episodeId: "episode-1", version: 2, idempotent: true });
    expect(store.transitionInputs).toHaveLength(1);
    expect(store.audits).toHaveLength(1);
  });

  it("devuelve conflicto de concurrencia optimista sin escribir historial", async () => {
    const store = new MemoryEpisodeStore();
    store.seedDraft();
    store.forceConcurrencyConflict = true;
    await expect(activate(store)).rejects.toBeInstanceOf(EpisodeConcurrencyConflictError);
    expect(store.transitions).toHaveLength(0);
    expect(store.audits).toHaveLength(0);
  });

  it("audita cada transición de estado confirmada", async () => {
    const store = new MemoryEpisodeStore();
    store.seedDraft();
    await activate(store);
    await new TransitionDischargeEpisodeService(store, pendingGovernance).execute({
      actor: principal("clinician-1", ["clinician"]),
      episodeId: "episode-1",
      targetStatus: "PAUSED",
      expectedVersion: 2,
      reason: "Revisión humana sintética",
      idempotencyKey: "pause:episode-001",
      correlationId: randomUUID(),
    });
    expect(store.audits.map(({ action }) => action)).toEqual([
      "EPISODE_TRANSITIONED",
      "EPISODE_TRANSITIONED",
    ]);
    expect(store.transitionInputs.map(({ toStatus }) => toStatus)).toEqual(["ACTIVE", "PAUSED"]);
  });

  it("compone la vista desde DischargeEpisode, avisos y tareas existentes sin mutarlos", async () => {
    const store = new MemoryEpisodeStore();
    store.seedDraft();
    await activate(store);
    store.openObligations = [
      { kind: "ALERT", resourceId: "alert-existing", state: "reviewed" },
      { kind: "TASK", resourceId: "task-existing", state: "open", revision: 2 },
    ];

    const view = await new GetEpisodeGovernanceViewService(store, pendingGovernance).execute({
      actor: principal("nurse-1", ["nurse"]),
      episodeId: "episode-1",
      correlationId: randomUUID(),
      now: new Date("2026-07-25T12:00:00Z"),
    });

    expect(view).toMatchObject({
      episodeId: "episode-1",
      episodeVersion: 2,
      episodeStatus: "ACTIVE",
      responsibleNurse: { userId: "nurse-1", active: true },
      responsibleClinician: { userId: "clinician-1", active: true },
      transitionDecision: { targetStatus: "CLOSED", authorization: "NOT_AUTHORIZED" },
    });
    expect(view.openObligations).toEqual(store.openObligations);
    expect(view.blockers.map(({ code }) => code)).toEqual([
      "UNRESOLVED_ALERTS",
      "OPEN_TASKS",
      "DEC_002_EPISODE_CLOSURE_POLICY_PENDING",
    ]);
    expect(store.transitions).toHaveLength(1);
    expect(store.audits).toHaveLength(1);
  });

  it("falla cerrado cuando la política de gobernanza está ausente", async () => {
    const store = new MemoryEpisodeStore();
    store.seedDraft();
    await activate(store);

    await expect(
      new TransitionDischargeEpisodeService(store, null).execute({
        actor: principal("nurse-1", ["nurse"]),
        episodeId: "episode-1",
        targetStatus: "CLOSED",
        expectedVersion: 2,
        reason: "Cierre sintético revisado",
        idempotencyKey: "close:no-policy-001",
        correlationId: randomUUID(),
      }),
    ).rejects.toMatchObject({
      blockerCodes: expect.arrayContaining([
        "GOVERNANCE_POLICY_UNAVAILABLE",
        "DEC_002_EPISODE_CLOSURE_POLICY_PENDING",
      ]),
    });
    expect(store.episode?.status).toBe("ACTIVE");
  });

  it("falla cerrado ante error o estado inconsistente de la evaluación", async () => {
    const store = new MemoryEpisodeStore();
    store.seedDraft();
    await activate(store);
    const failingPolicy: EpisodeGovernancePolicy = {
      evaluate: async () => {
        throw new Error("synthetic clinical detail that must not escape");
      },
    };

    await expect(
      new TransitionDischargeEpisodeService(store, failingPolicy).execute({
        actor: principal("nurse-1", ["nurse"]),
        episodeId: "episode-1",
        targetStatus: "CLOSED",
        expectedVersion: 2,
        reason: "Cierre sintético revisado",
        idempotencyKey: "close:policy-error-001",
        correlationId: randomUUID(),
      }),
    ).rejects.toMatchObject({
      blockerCodes: expect.arrayContaining(["GOVERNANCE_EVALUATION_FAILED"]),
    });
    const inconsistentPolicy: EpisodeGovernancePolicy = {
      evaluate: async (input) => {
        const view = await pendingGovernance.evaluate(input);
        return { ...view, episodeVersion: view.episodeVersion + 1 };
      },
    };
    await expect(
      new TransitionDischargeEpisodeService(store, inconsistentPolicy).execute({
        actor: principal("nurse-1", ["nurse"]),
        episodeId: "episode-1",
        targetStatus: "CLOSED",
        expectedVersion: 2,
        reason: "Cierre sintético revisado",
        idempotencyKey: "close:policy-state-001",
        correlationId: randomUUID(),
      }),
    ).rejects.toMatchObject({
      blockerCodes: expect.arrayContaining(["GOVERNANCE_STATE_INCONSISTENT"]),
    });
    expect(store.episode?.status).toBe("ACTIVE");
    expect(store.transitions).toHaveLength(1);
    expect(store.audits).toHaveLength(1);
  });

  it("DEC-002 pendiente no puede eludirse con una política permisiva inyectada", async () => {
    const store = new MemoryEpisodeStore();
    store.seedDraft();
    await activate(store);
    const permissivePolicy: EpisodeGovernancePolicy = {
      evaluate: async (input) => {
        const view = await pendingGovernance.evaluate(input);
        return {
          ...view,
          blockers: [],
          pendingInstitutionalDecisions: [],
          organizationallyGoverned: true,
          transitionDecision: { targetStatus: "CLOSED", authorization: "AUTHORIZED" },
        };
      },
    };

    await expect(
      new TransitionDischargeEpisodeService(store, permissivePolicy).execute({
        actor: principal("nurse-1", ["nurse"]),
        episodeId: "episode-1",
        targetStatus: "CLOSED",
        expectedVersion: 2,
        reason: "Cierre sintético revisado",
        idempotencyKey: "close:permissive-001",
        correlationId: randomUUID(),
      }),
    ).rejects.toMatchObject({
      blockerCodes: ["DEC_002_EPISODE_CLOSURE_POLICY_PENDING"],
    });
    expect(store.episode?.status).toBe("ACTIVE");
    expect(store.transitions).toHaveLength(1);
    expect(store.audits).toHaveLength(1);
  });

  it("bloquea cierre con avisos abiertos y exige motivo", async () => {
    const store = new MemoryEpisodeStore();
    store.seedDraft();
    await activate(store);
    store.openObligations = [{ kind: "ALERT", resourceId: "alert-1", state: "open" }];
    const service = new TransitionDischargeEpisodeService(store, pendingGovernance);
    await expect(
      service.execute({
        actor: principal("nurse-1", ["nurse"]),
        episodeId: "episode-1",
        targetStatus: "CLOSED",
        expectedVersion: 2,
        reason: "Cierre sintético revisado",
        idempotencyKey: "close:episode-001",
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(EpisodeClosureBlockedError);
  });

  it("rechaza un cierre sin motivo antes de consultar la política", async () => {
    const store = new MemoryEpisodeStore();
    store.seedDraft();
    await activate(store);
    await expect(
      new TransitionDischargeEpisodeService(store, pendingGovernance).execute({
        actor: principal("nurse-1", ["nurse"]),
        episodeId: "episode-1",
        targetStatus: "CLOSED",
        expectedVersion: 2,
        idempotencyKey: "close:no-reason-001",
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(Error);
    expect(store.episode?.status).toBe("ACTIVE");
  });
});
