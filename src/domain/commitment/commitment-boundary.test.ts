import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

async function sourceFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(root, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return /\.(?:ts|tsx)$/u.test(entry.name) ? [path] : [];
    }),
  );
  return nested.flat();
}

describe("commitment 5B static boundary", () => {
  it("no es importado por rutas API ni presentación", async () => {
    const roots = [join(process.cwd(), "src/app"), join(process.cwd(), "src/presentation")];
    for (const root of roots) {
      for (const file of await sourceFiles(root)) {
        const source = await readFile(file, "utf8");
        expect(source, relative(process.cwd(), file)).not.toMatch(
          /(?:domain|application|infrastructure\/persistence)\/commitment/iu,
        );
      }
    }
  });

  it("no depende de módulos clínicos ni de sus servicios", async () => {
    const roots = [
      join(process.cwd(), "src/domain/commitment"),
      join(process.cwd(), "src/application/commitment"),
      join(process.cwd(), "src/application/ports/commitment-unit-of-work.ts"),
      join(process.cwd(), "src/infrastructure/persistence/prisma-commitment-unit-of-work.ts"),
    ];
    const files = (
      await Promise.all(
        roots.map(async (root) => (root.endsWith(".ts") ? [root] : sourceFiles(root))),
      )
    ).flat();
    for (const file of files.filter((path) => !path.endsWith(".test.ts"))) {
      const source = await readFile(file, "utf8");
      expect(source, relative(process.cwd(), file)).not.toMatch(
        /(?:domain|application)\/(?:alerts|check-in|sbar|home-safety|caregiver)/iu,
      );
    }
  });

  it("mantiene catálogos posteriores fuera del código y del schema 5B", async () => {
    const futureNames = [
      ["EVIDENCE", "RECEIVED"].join("_"),
      ["EVIDENCE", "MISSING"].join("_"),
      ["NON", "COMPLIANT"].join("_"),
      ["OVER", "DUE"].join("_"),
      ["RECORD", "COMPATIBLE", "EVIDENCE"].join("_"),
      ["JUSTIFY", "EXCEPTION"].join("_"),
      ["CONFIRM", "NON", "FULFILMENT"].join("_"),
    ];
    const productionFiles = [
      join(process.cwd(), "src/domain/commitment/commitment.ts"),
      join(process.cwd(), "src/domain/commitment/commitment-authorization.ts"),
      join(process.cwd(), "src/application/commitment/manage-commitments.ts"),
      join(process.cwd(), "src/application/ports/commitment-unit-of-work.ts"),
      join(process.cwd(), "src/infrastructure/persistence/prisma-commitment-unit-of-work.ts"),
      join(process.cwd(), "prisma/schema.prisma"),
      join(
        process.cwd(),
        "prisma/migrations/20260802000100_commitment_sandbox_core_5b/migration.sql",
      ),
    ];
    const source = (await Promise.all(productionFiles.map((file) => readFile(file, "utf8")))).join(
      "\n",
    );
    for (const name of futureNames) expect(source).not.toContain(name);
    expect(source).not.toMatch(/\b(?:scheduler|worker|cron|webhook|notification)\b/iu);
  });

  it("materializa exactamente tres estados y tres eventos en Prisma", async () => {
    const schema = await readFile(join(process.cwd(), "prisma/schema.prisma"), "utf8");
    const states = schema.match(/enum EpisodeCommitmentState \{(?<body>[^}]+)\}/u)?.groups?.body;
    const events = schema.match(/enum CommitmentEventType \{(?<body>[^}]+)\}/u)?.groups?.body;
    expect(states?.match(/[A-Z][A-Z_]+/gu)).toEqual([
      "DRAFT",
      "AWAITING_EVIDENCE",
      "SUPERSEDED_BY_CORRECTION",
    ]);
    expect(events?.match(/[A-Z][A-Z_]+/gu)).toEqual([
      "COMMITMENT_DRAFT_CREATED",
      "COMMITMENT_ACTIVATED",
      "COMMITMENT_SUPERSEDED",
    ]);
  });
});
