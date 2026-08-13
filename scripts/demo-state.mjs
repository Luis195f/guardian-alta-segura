import { createHash } from "node:crypto";

import manifest from "../config/synthetic-demo-manifest.json" with { type: "json" };
import syntheticRuleFixtures from "../src/domain/alerts/synthetic-rule-fixtures.json" with { type: "json" };

export class DemoStateError extends Error {
  constructor(code) {
    super(code);
    this.name = "DemoStateError";
    this.code = code;
  }
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(value[key])]),
  );
}

export function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function assertState(condition, code) {
  if (!condition) throw new DemoStateError(code);
}

function answerValue(answer) {
  if (answer.scaleValue !== null) return { scaleValue: answer.scaleValue };
  if (answer.yesNoValue !== null) return { yesNoValue: answer.yesNoValue };
  if (answer.selectedOption !== null) return { selectedOption: answer.selectedOption };
  return { shortTextValue: answer.shortTextValue };
}

export async function readDemoMaterialState(prisma) {
  const aliases = manifest.identities.map(({ alias }) => alias);
  const users = await prisma.user.findMany({
    where: { syntheticAlias: { startsWith: "demo-" } },
    orderBy: { syntheticAlias: "asc" },
    select: {
      syntheticAlias: true,
      displayLabel: true,
      isActive: true,
      isSynthetic: true,
      roleAssignments: {
        where: { revokedAt: null },
        orderBy: { role: "asc" },
        select: { role: true },
      },
    },
  });

  assertState(users.length === manifest.identities.length, "DEMO_IDENTITY_SET_DRIFT");
  for (const expected of manifest.identities) {
    const user = users.find(({ syntheticAlias }) => syntheticAlias === expected.alias);
    assertState(Boolean(user), "DEMO_IDENTITY_MISSING");
    assertState(user.isActive && user.isSynthetic, "DEMO_IDENTITY_INACTIVE_OR_NON_SYNTHETIC");
    assertState(
      user.displayLabel === `SINTÉTICO / NO USO CLÍNICO — ${expected.role}`,
      "DEMO_IDENTITY_LABEL_DRIFT",
    );
    assertState(
      stableJson(user.roleAssignments.map(({ role }) => role)) === stableJson([expected.role]),
      "DEMO_IDENTITY_ROLE_DRIFT",
    );
  }
  assertState(
    users.every(({ syntheticAlias }) => aliases.includes(syntheticAlias)),
    "DEMO_IDENTITY_SET_DRIFT",
  );

  const policies = await prisma.policyVersion.findMany({
    where: { version: "pending-local-v1" },
    orderBy: { policyKey: "asc" },
    select: {
      policyKey: true,
      version: true,
      recordType: true,
      scope: true,
      state: true,
      origin: true,
      evidenceType: true,
      evidenceRef: true,
    },
  });
  assertState(policies.length === 12, "DEMO_POLICY_SET_DRIFT");
  assertState(
    policies.every(
      ({ state, origin, evidenceType, evidenceRef }) =>
        state === "PENDING" &&
        origin === "INSTITUTIONAL_CONFIGURATION" &&
        evidenceType === "INSTITUTIONAL_DECISION_REFERENCE" &&
        evidenceRef === "DEC-003-OR-DEC-004-PENDING",
    ),
    "DEMO_POLICY_CONFIGURATION_DRIFT",
  );

  const protocol = await prisma.checkInProtocolVersion.findUnique({
    where: {
      protocolKey_versionNumber: {
        protocolKey: manifest.fixtures.checkInProtocol,
        versionNumber: 1,
      },
    },
    select: {
      protocolKey: true,
      versionNumber: true,
      title: true,
      state: true,
      isSyntheticFixture: true,
      schedule: {
        select: {
          intervalDays: true,
          firstDayOffset: true,
          localTime: true,
          timeZone: true,
          responseWindowMinutes: true,
        },
      },
      questions: {
        orderBy: { position: "asc" },
        select: {
          questionKey: true,
          position: true,
          type: true,
          prompt: true,
          required: true,
          scaleMinimum: true,
          scaleMaximum: true,
          scaleMinimumLabel: true,
          scaleMaximumLabel: true,
          options: true,
          maximumTextLength: true,
        },
      },
    },
  });
  assertState(Boolean(protocol), "DEMO_CHECK_IN_PROTOCOL_MISSING");
  assertState(
    protocol.title === "PLANTILLA SINTÉTICA / NO APROBADA" &&
      protocol.state === "SYNTHETIC_DEMO" &&
      protocol.isSyntheticFixture &&
      protocol.questions.length === 8 &&
      protocol.schedule?.intervalDays === 3,
    "DEMO_CHECK_IN_PROTOCOL_DRIFT",
  );

  const fixtureRuleKeys = syntheticRuleFixtures.map(({ ruleKey }) => ruleKey).sort();
  const fixtureRules = await prisma.ruleDefinition.findMany({
    where: { ruleKey: { in: fixtureRuleKeys } },
    orderBy: { ruleKey: "asc" },
    select: {
      ruleKey: true,
      name: true,
      isSyntheticFixture: true,
      versions: {
        where: { versionNumber: 1 },
        select: {
          versionNumber: true,
          state: true,
          schemaVersion: true,
          allowedInputs: true,
          temporalWindow: true,
          condition: true,
          administrativeSeverity: true,
          explanation: true,
          reviewOwner: true,
          approval: { select: { approvalReference: true } },
        },
      },
    },
  });
  assertState(fixtureRules.length === 4, "DEMO_DRAFT_RULE_SET_DRIFT");
  assertState(
    fixtureRules.every(
      ({ isSyntheticFixture, versions }) =>
        isSyntheticFixture &&
        versions.length === 1 &&
        versions[0].state === "DRAFT" &&
        !versions[0].approval,
    ),
    "DEMO_DRAFT_RULE_CONFIGURATION_DRIFT",
  );

  const flowRule = await prisma.ruleDefinition.findUnique({
    where: { ruleKey: manifest.fixtures.flowRule },
    select: {
      ruleKey: true,
      name: true,
      isSyntheticFixture: true,
      versions: {
        orderBy: { versionNumber: "asc" },
        select: {
          versionNumber: true,
          state: true,
          schemaVersion: true,
          allowedInputs: true,
          temporalWindow: true,
          condition: true,
          administrativeSeverity: true,
          explanation: true,
          reviewOwner: true,
          approval: { select: { approvalReference: true } },
        },
      },
    },
  });
  assertState(
    flowRule?.isSyntheticFixture &&
      flowRule.versions.length === 1 &&
      flowRule.versions[0].state === "ACTIVE" &&
      flowRule.versions[0].approval?.approvalReference === "SYNTHETIC-DEMO-TECHNICAL-ONLY",
    "DEMO_FLOW_FIXTURE_DRIFT",
  );

  const patient = await prisma.patient.findUnique({
    where: { externalPseudonymousId: manifest.fixtures.patient },
    select: {
      externalPseudonymousId: true,
      isSynthetic: true,
      identityVerificationState: true,
      portalUser: { select: { syntheticAlias: true } },
    },
  });
  assertState(
    patient?.isSynthetic &&
      patient.identityVerificationState === "VERIFIED" &&
      patient.portalUser?.syntheticAlias === "demo-patient",
    "DEMO_PATIENT_DRIFT",
  );

  const episode = await prisma.dischargeEpisode.findUnique({
    where: { id: manifest.fixtures.episode },
    select: {
      id: true,
      dischargeDate: true,
      programLengthDays: true,
      status: true,
      version: true,
      patient: { select: { externalPseudonymousId: true } },
      responsibleNurse: { select: { syntheticAlias: true } },
      responsibleClinician: { select: { syntheticAlias: true } },
      checkInProtocolVersion: { select: { protocolKey: true, versionNumber: true } },
      transitions: {
        orderBy: { resultingVersion: "asc" },
        select: { fromStatus: true, toStatus: true, resultingVersion: true },
      },
    },
  });
  assertState(
    episode?.patient.externalPseudonymousId === manifest.fixtures.patient &&
      episode.responsibleNurse.syntheticAlias === "demo-nurse" &&
      episode.responsibleClinician.syntheticAlias === "demo-clinician" &&
      episode.status === "ACTIVE" &&
      episode.programLengthDays === 30 &&
      episode.version === 2 &&
      episode.transitions.length === 2,
    "DEMO_EPISODE_DRIFT",
  );

  const safetyPlan = await prisma.safetyPlan.findUnique({
    where: { id: manifest.fixtures.safetyPlan },
    select: {
      id: true,
      revision: true,
      currentVersion: true,
      activeVersionNumber: true,
      versions: {
        orderBy: { versionNumber: "asc" },
        select: {
          versionNumber: true,
          sections: {
            orderBy: { step: "asc" },
            select: {
              step: true,
              content: true,
              provenance: true,
              permissions: {
                orderBy: { audience: "asc" },
                select: { audience: true, canView: true },
              },
            },
          },
          stateChanges: {
            orderBy: { sequence: "asc" },
            select: { sequence: true, resultingState: true },
          },
        },
      },
    },
  });
  assertState(
    safetyPlan?.revision === 2 &&
      safetyPlan.currentVersion === 1 &&
      safetyPlan.activeVersionNumber === 1 &&
      safetyPlan.versions.length === 1 &&
      safetyPlan.versions[0].sections.length === 6,
    "DEMO_SAFETY_PLAN_DRIFT",
  );

  const assignment = await prisma.checkInAssignment.findUnique({
    where: { id: manifest.fixtures.checkInAssignment },
    select: {
      sequence: true,
      outcome: {
        select: {
          type: true,
          response: {
            select: {
              answers: {
                orderBy: { questionDefinition: { position: "asc" } },
                select: {
                  scaleValue: true,
                  yesNoValue: true,
                  selectedOption: true,
                  shortTextValue: true,
                  questionDefinition: { select: { questionKey: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  assertState(
    assignment?.sequence === 1 &&
      assignment.outcome?.type === "RESPONDED" &&
      assignment.outcome.response?.answers.length === 8,
    "DEMO_CHECK_IN_RESPONSE_DRIFT",
  );

  const homeSafety = await prisma.homeSafetyReviewVersion.findUnique({
    where: { id: manifest.fixtures.homeSafety },
    select: {
      versionNumber: true,
      templateKey: true,
      templateVersion: true,
      informationalPurposeAcknowledged: true,
      humanReviewed: true,
      items: {
        orderBy: { itemKey: "asc" },
        select: { itemKey: true, state: true, provenance: true },
      },
    },
  });
  assertState(
    homeSafety?.versionNumber === 1 &&
      homeSafety.informationalPurposeAcknowledged &&
      !homeSafety.humanReviewed &&
      homeSafety.items.length === 4 &&
      homeSafety.items.every(({ state }) => state === "NOT_REVIEWED"),
    "DEMO_HOME_SAFETY_DRIFT",
  );

  const alert = await prisma.alert.findUnique({
    where: { id: manifest.fixtures.flowAlert },
    select: {
      id: true,
      ruleVersionNumber: true,
      inputReferences: true,
      explanation: true,
      administrativeSeverity: true,
      reviewOwner: true,
      currentState: true,
      definition: { select: { ruleKey: true } },
      evaluation: { select: { outcome: true, inputSnapshot: true } },
      reviews: { select: { id: true } },
      tasks: { select: { id: true } },
    },
  });
  assertState(
    alert?.definition.ruleKey === manifest.fixtures.flowRule &&
      alert.currentState === "OPEN" &&
      alert.evaluation.outcome === "MATCHED" &&
      alert.reviews.length === 0 &&
      alert.tasks.length === 0,
    "DEMO_FLOW_STATE_DRIFT",
  );

  const commitmentCount = await prisma.episodeCommitment.count();
  assertState(commitmentCount === 0, "DEMO_COMMITMENT_ENGINE_STATE_PRESENT");

  return {
    manifestVersion: manifest.manifestVersion,
    identities: users.map(({ roleAssignments, ...user }) => ({
      ...user,
      activeRoles: roleAssignments.map(({ role }) => role),
    })),
    policies,
    protocol,
    draftRules: fixtureRules,
    technicalFlowRule: flowRule,
    patient,
    episode: {
      ...episode,
      dischargeDate: episode.dischargeDate.toISOString().slice(0, 10),
    },
    safetyPlan,
    checkIn: {
      sequence: assignment.sequence,
      outcome: assignment.outcome.type,
      answers: assignment.outcome.response.answers.map((answer) => ({
        questionKey: answer.questionDefinition.questionKey,
        ...answerValue(answer),
      })),
    },
    homeSafety,
    alert: {
      ...alert,
      reviews: alert.reviews.length,
      tasks: alert.tasks.length,
    },
    commitmentCount,
  };
}

export function fingerprintDemoMaterialState(state) {
  return createHash("sha256").update(stableJson(state)).digest("hex");
}

export async function readDemoFingerprint(prisma) {
  const state = await readDemoMaterialState(prisma);
  return { state, fingerprint: fingerprintDemoMaterialState(state) };
}
