import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  CreateDischargeEpisodeService,
  EpisodeClosureBlockedError,
  EpisodeConcurrencyConflictError,
  EpisodeDeniedError,
  EpisodeIdentityNotVerifiedError,
  EpisodeResponsibleProfessionalsError,
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
import type { EpisodeClosurePolicy } from "@/domain/episode/activation-policy";
import type {
  EpisodeActorRole,
  EpisodeStatus,
  ProgramLengthDays,
} from "@/domain/episode/discharge-episode";

const allowClosure: EpisodeClosurePolicy = { evaluate: async () => ({ allowed: true }) };
const denyClosure: EpisodeClosurePolicy = {
  evaluate: async () => ({ allowed: false, reason: "OPEN_ALERTS" }),
};

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
  return new TransitionDischargeEpisodeService(store, allowClosure).execute({
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
    await new TransitionDischargeEpisodeService(store, allowClosure).execute({
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

  it("bloquea cierre con avisos abiertos y exige motivo", async () => {
    const store = new MemoryEpisodeStore();
    store.seedDraft();
    await activate(store);
    const service = new TransitionDischargeEpisodeService(store, denyClosure);
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
      new TransitionDischargeEpisodeService(store, allowClosure).execute({
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
