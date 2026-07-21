import { describe, expect, it } from "vitest";

import {
  AcceptCaregiverInvitationService,
  CaregiverAccessDeniedError,
  CaregiverAccessConflictError,
  ChangeCaregiverScopeService,
  CreateCaregiverInvitationService,
} from "@/application/caregiver/manage-caregiver-access";
import type {
  CaregiverAccessTransaction,
  CaregiverAccessUnitOfWork,
  CaregiverAuthorizationContext,
  CaregiverInvitationRecord,
  CaregiverScopeRecord,
  NewCaregiverAccessAudit,
} from "@/application/ports/caregiver-access-unit-of-work";
import type { NewAuditEvent } from "@/domain/audit/audit-event";

const now = new Date("2026-07-21T10:00:00.000Z");
const correlationId = "018f673a-4e35-7060-99b5-7bc6feba3a97";
const demoTtl = { invitationTtlMs: 30 * 60 * 1000, sessionTtlMs: 8 * 60 * 60 * 1000 };
const patient = { userId: "patient-1", roles: ["patient" as const], sessionId: "patient-session" };
const caregiver = {
  userId: "caregiver-1",
  roles: ["caregiver" as const],
  sessionId: "caregiver-login-session",
};

const authorization: CaregiverAuthorizationContext = {
  id: "authorization-1",
  subjectUserId: patient.userId,
  caregiverUserId: caregiver.userId,
  state: "ACTIVE",
  scope: "caregiver:portal",
  policyVersionId: "policy-1",
  recordedAt: new Date("2026-07-20T10:00:00.000Z"),
  expiresAt: new Date("2026-08-20T10:00:00.000Z"),
  policy: {
    id: "policy-1",
    policyKey: "caregiver-portal",
    version: "v1",
    recordType: "CAREGIVER_AUTHORIZATION",
    state: "APPROVED",
    scope: "caregiver:portal",
    actorUserId: "admin-1",
    recordedAt: new Date("2026-07-01T10:00:00.000Z"),
    origin: "INSTITUTIONAL_CONFIGURATION",
    evidenceType: "INSTITUTIONAL_DECISION_REFERENCE",
    evidenceRef: "SYNTHETIC-POLICY",
  },
  revokedAt: null,
};

class MemoryCaregiverStore implements CaregiverAccessUnitOfWork, CaregiverAccessTransaction {
  authorization: CaregiverAuthorizationContext = authorization;
  scope: CaregiverScopeRecord | null = null;
  readonly scopes = new Map<string, CaregiverScopeRecord>();
  invitation: CaregiverInvitationRecord | null = null;
  readonly sessions: { id: string; hash: string }[] = [];
  readonly audits: NewCaregiverAccessAudit[] = [];
  readonly generalAudits: NewAuditEvent[] = [];

  async run<T>(operation: (transaction: CaregiverAccessTransaction) => Promise<T>) {
    return operation(this);
  }
  async lockAuthorization() {}
  async getAuthorization(id: string) {
    return id === this.authorization.id ? this.authorization : null;
  }
  async getEpisode(id: string) {
    return id === "episode-1" || id === "episode-2"
      ? { id, patientPortalUserId: patient.userId, patientIsSynthetic: true }
      : null;
  }
  async isActiveUserWithRole(userId: string, role: "patient" | "caregiver") {
    return (
      (userId === patient.userId && role === "patient") ||
      (userId === caregiver.userId && role === "caregiver")
    );
  }
  async ensureProfile(input: {
    readonly caregiverUserId: string;
    readonly externalPseudonymousId: string;
  }) {
    return { id: "profile-1", ...input };
  }
  async getLatestScope(_authorizationId: string, dischargeEpisodeId: string) {
    return this.scopes.get(dischargeEpisodeId) ?? null;
  }
  async createScope(input: Parameters<CaregiverAccessTransaction["createScope"]>[0]) {
    this.scope = {
      id: `scope-${input.version}`,
      dischargeEpisodeId: input.dischargeEpisodeId,
      version: input.version,
      capabilities: input.capabilities,
      allowedPlanSections: input.allowedPlanSections,
      authorizedResourceKeys: input.authorizedResourceKeys,
    };
    this.scopes.set(input.dischargeEpisodeId, this.scope);
    return this.scope;
  }
  async createInvitation(input: Parameters<CaregiverAccessTransaction["createInvitation"]>[0]) {
    this.invitation = {
      id: "invitation-1",
      caregiverAuthorizationId: input.caregiverAuthorizationId,
      caregiverProfileId: input.caregiverProfileId,
      dischargeEpisodeId: input.dischargeEpisodeId,
      expiresAt: input.expiresAt,
      consumedAt: null,
      profile: {
        id: input.caregiverProfileId,
        caregiverUserId: caregiver.userId,
        externalPseudonymousId: "cg_0123456789abcdef01234567",
      },
      authorization: this.authorization,
    };
    return { id: this.invitation.id };
  }
  async findInvitationByTokenHash(hash: string) {
    return hash === "invitation-hash" ? this.invitation : null;
  }
  async consumeInvitation(id: string, consumedAt: Date) {
    if (!this.invitation || this.invitation.id !== id || this.invitation.consumedAt) return false;
    this.invitation = { ...this.invitation, consumedAt };
    return true;
  }
  async createSession(input: Parameters<CaregiverAccessTransaction["createSession"]>[0]) {
    const session = { id: `session-${this.sessions.length + 1}`, hash: input.sessionTokenHash };
    this.sessions.push(session);
    return { id: session.id };
  }
  async appendAuditEvent(input: NewAuditEvent) {
    this.generalAudits.push(input);
    return { id: `audit-${this.generalAudits.length}` };
  }
  async appendAccessAudit(input: NewCaregiverAccessAudit) {
    this.audits.push(input);
    return { id: `access-audit-${this.audits.length}` };
  }
}

const scope = {
  capabilities: ["VIEW_PLAN_SECTIONS", "SEND_OBSERVATIONS"] as const,
  allowedPlanSections: ["WARNING_SIGNS"] as const,
  authorizedResourceKeys: [] as const,
};

async function issueInvitation(store: MemoryCaregiverStore, episodeId = "episode-1") {
  return new CreateCaregiverInvitationService(
    store,
    { issue: () => ({ raw: "invitation-token", hash: "invitation-hash" }) },
    { issue: () => "cg_0123456789abcdef01234567" },
    { deliver: async (input) => ({ localAcceptanceToken: input.rawToken }) },
    demoTtl,
    () => now,
  ).execute({
    actor: patient,
    caregiverAuthorizationId: authorization.id,
    episodeId,
    scope,
    correlationId,
  });
}

describe("caregiver invitation and scope services", () => {
  it("crea una invitación local de un uso sobre autorización explícita vigente", async () => {
    const store = new MemoryCaregiverStore();
    const result = await issueInvitation(store);
    expect(result.localAcceptanceToken).toBe("invitation-token");
    expect(store.scope?.version).toBe(1);
    expect(store.audits.at(-1)).toMatchObject({ action: "INVITATION_CREATED" });
  });

  it("rechaza una invitación vencida y una reutilizada", async () => {
    const expiredStore = new MemoryCaregiverStore();
    await issueInvitation(expiredStore);
    expiredStore.invitation = {
      ...expiredStore.invitation!,
      expiresAt: new Date("2026-07-21T09:59:59.000Z"),
    };
    const expiredService = new AcceptCaregiverInvitationService(
      expiredStore,
      { issue: () => ({ raw: "session-token", hash: "session-hash" }) },
      demoTtl,
      () => now,
    );
    await expect(
      expiredService.execute({
        actor: caregiver,
        invitationTokenHash: "invitation-hash",
        correlationId,
      }),
    ).rejects.toBeInstanceOf(CaregiverAccessDeniedError);
    expect(expiredStore.audits.at(-1)).toMatchObject({
      action: "INVITATION_DENIED",
      outcome: "DENIED",
    });

    const reusedStore = new MemoryCaregiverStore();
    await issueInvitation(reusedStore);
    const accept = new AcceptCaregiverInvitationService(
      reusedStore,
      { issue: () => ({ raw: "session-token", hash: "session-hash" }) },
      demoTtl,
      () => now,
    );
    await accept.execute({
      actor: caregiver,
      invitationTokenHash: "invitation-hash",
      correlationId,
    });
    await expect(
      accept.execute({
        actor: caregiver,
        invitationTokenHash: "invitation-hash",
        correlationId,
      }),
    ).rejects.toBeInstanceOf(CaregiverAccessDeniedError);
    expect(reusedStore.sessions).toHaveLength(1);
  });

  it("versiona un cambio de scope y rechaza revisiones concurrentes obsoletas", async () => {
    const store = new MemoryCaregiverStore();
    await issueInvitation(store);
    const service = new ChangeCaregiverScopeService(store, () => now);
    const changed = await service.execute({
      actor: patient,
      caregiverAuthorizationId: authorization.id,
      episodeId: "episode-1",
      expectedVersion: 1,
      scope: {
        capabilities: ["VIEW_AUTHORIZED_RESOURCES"],
        allowedPlanSections: [],
        authorizedResourceKeys: ["demo-caregiver-boundaries"],
      },
      correlationId,
    });
    expect(changed.version).toBe(2);
    expect(store.audits.at(-1)).toMatchObject({ action: "SCOPE_CHANGED" });
    await expect(
      service.execute({
        actor: patient,
        caregiverAuthorizationId: authorization.id,
        episodeId: "episode-1",
        expectedVersion: 1,
        scope,
        correlationId,
      }),
    ).rejects.toBeInstanceOf(CaregiverAccessConflictError);
  });

  it("versiona el scope de cada episodio sin propagar cambios a otro episodio", async () => {
    const store = new MemoryCaregiverStore();
    await issueInvitation(store, "episode-1");
    await new ChangeCaregiverScopeService(store, () => now).execute({
      actor: patient,
      caregiverAuthorizationId: authorization.id,
      episodeId: "episode-1",
      expectedVersion: 1,
      scope: {
        capabilities: ["VIEW_AUTHORIZED_RESOURCES"],
        allowedPlanSections: [],
        authorizedResourceKeys: ["demo-caregiver-boundaries"],
      },
      correlationId,
    });

    await issueInvitation(store, "episode-2");

    await expect(store.getLatestScope(authorization.id, "episode-1")).resolves.toMatchObject({
      dischargeEpisodeId: "episode-1",
      version: 2,
    });
    await expect(store.getLatestScope(authorization.id, "episode-2")).resolves.toMatchObject({
      dischargeEpisodeId: "episode-2",
      version: 1,
    });
  });

  it("impide que support acepte la invitación como cuidador", async () => {
    const store = new MemoryCaregiverStore();
    await issueInvitation(store);
    await expect(
      new AcceptCaregiverInvitationService(
        store,
        { issue: () => ({ raw: "session-token", hash: "session-hash" }) },
        demoTtl,
        () => now,
      ).execute({
        actor: { userId: "support-1", roles: ["support"], sessionId: "support-session" },
        invitationTokenHash: "invitation-hash",
        correlationId,
      }),
    ).rejects.toBeInstanceOf(CaregiverAccessDeniedError);
  });
});
