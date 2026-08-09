import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  canonicalOperationalHref,
  type OperationalSourceType,
} from "@/domain/continuity/operational-continuity";
import { parseEpisodeWorkspaceTab } from "@/presentation/navigation/episode-tabs";

describe("operational continuity static boundary", () => {
  it("mantiene fuentes separadas y no crea otra fuente persistida", async () => {
    const reader = await readFile(
      join(process.cwd(), "src/infrastructure/persistence/prisma-operational-continuity-reader.ts"),
      "utf8",
    );
    for (const sourceType of [
      "EPISODE",
      "CHECK_IN",
      "RULE_EVALUATION",
      "ALERT",
      "ALERT_REVIEW",
      "TASK",
      "GOVERNANCE_EVIDENCE",
    ]) {
      expect(reader).toContain(`'${sourceType}'`);
    }
    expect(reader).not.toMatch(/episode_commitments|commitment_events|evidence_log|task_case/iu);
    expect(reader).not.toMatch(/\b(?:INSERT|UPDATE|DELETE)\b/iu);
    expect(reader).not.toContain("READ_MODEL_AVAILABLE");
    expect(reader).toContain("READ_MODEL_REFERENCE");
    expect(reader).toContain("LIMIT ${input.pageSize + 1}");
  });

  it("enlaza cada fuente a su pestaña canónica allowlisted", () => {
    const episodeId = "SYNTH-EPISODE/01";
    const expected: Readonly<Record<OperationalSourceType, string>> = {
      EPISODE: "/episodes/SYNTH-EPISODE%2F01",
      CHECK_IN: "/episodes/SYNTH-EPISODE%2F01?tab=check-ins",
      RULE_EVALUATION: "/episodes/SYNTH-EPISODE%2F01?tab=evidence",
      ALERT: "/episodes/SYNTH-EPISODE%2F01?tab=alerts",
      ALERT_REVIEW: "/episodes/SYNTH-EPISODE%2F01?tab=evidence",
      TASK: "/episodes/SYNTH-EPISODE%2F01?tab=follow-up",
      GOVERNANCE_EVIDENCE: "/episodes/SYNTH-EPISODE%2F01?tab=evidence",
    };
    for (const [sourceType, href] of Object.entries(expected)) {
      expect(canonicalOperationalHref(sourceType as OperationalSourceType, episodeId)).toBe(href);
    }
  });

  it("acepta solo pestañas conocidas y falla a summary", () => {
    expect(parseEpisodeWorkspaceTab("check-ins")).toBe("check-ins");
    expect(parseEpisodeWorkspaceTab("evidence")).toBe("evidence");
    expect(parseEpisodeWorkspaceTab("../../admin")).toBe("summary");
    expect(parseEpisodeWorkspaceTab(["alerts"])).toBe("summary");
    expect(parseEpisodeWorkspaceTab(undefined)).toBe("summary");
  });

  it("mantiene el panel sin verbos HTTP de mutación ni scoring", async () => {
    const panel = await readFile(
      join(process.cwd(), "src/presentation/components/professional-dashboard.tsx"),
      "utf8",
    );
    expect(panel).not.toMatch(/method:\s*["'](?:POST|PATCH|PUT|DELETE)["']/u);
    expect(panel).not.toMatch(/riskScore|clinicalPriority|trafficLight|heatmap/iu);
    expect(panel).toMatch(/no ordena pacientes por\s+riesgo/u);
  });
});
