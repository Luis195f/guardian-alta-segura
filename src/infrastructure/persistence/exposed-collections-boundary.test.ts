import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function productionTypeScriptFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return productionTypeScriptFiles(path);
    return entry.isFile() && entry.name.endsWith(".ts") && !entry.name.includes(".test.")
      ? [path]
      : [];
  });
}

function calls(source: string, marker: string): string[] {
  const values: string[] = [];
  let from = 0;
  while (true) {
    const start = source.indexOf(marker, from);
    if (start === -1) return values;
    let depth = 1;
    let end = start + marker.length;
    for (; end < source.length; end += 1) {
      if (source[end] === "(") depth += 1;
      if (source[end] === ")") {
        depth -= 1;
        if (depth === 0) {
          end += 1;
          break;
        }
      }
    }
    values.push(source.slice(start, end));
    from = end;
  }
}

describe("exposed collection persistence boundary", () => {
  it("requires an explicit take or a validated input-id bound for every production findMany", () => {
    const roots = [
      join(process.cwd(), "src/app/api"),
      join(process.cwd(), "src/infrastructure/persistence"),
    ];
    const violations = productionTypeScriptFiles(roots[0]!)
      .concat(productionTypeScriptFiles(roots[1]!))
      .flatMap((file) =>
        calls(readFileSync(file, "utf8"), "findMany(")
          .filter((call) => !call.includes("take:") && !call.includes('id: { in: ids("'))
          .map(() => file.replace(`${process.cwd()}\\`, "")),
      );
    expect(violations).toEqual([]);
  });

  it("keeps corrected read models free of query execution inside row maps", () => {
    const files = productionTypeScriptFiles(join(process.cwd(), "src/infrastructure/persistence"));
    const offenders = files.filter((file) => readFileSync(file, "utf8").includes(".map(async"));
    expect(offenders).toEqual([]);
  });

  it("selects current caregiver scopes and authorized safety-plan versions before sentinels", () => {
    const caregiverReader = readFileSync(
      join(process.cwd(), "src/infrastructure/persistence/prisma-caregiver-access-unit-of-work.ts"),
      "utf8",
    );
    const safetyPlanReader = readFileSync(
      join(process.cwd(), "src/infrastructure/persistence/prisma-safety-plan-unit-of-work.ts"),
      "utf8",
    );

    expect(caregiverReader).toContain('PARTITION BY scope."caregiver_authorization_id"');
    expect(caregiverReader).toContain('WHERE ranked."revisionRank" = 1');
    expect(caregiverReader).not.toContain("authorization.scopes");
    expect(safetyPlanReader).toContain("WHERE ${visibility}");
    expect(safetyPlanReader).toContain('WHERE visible."collectionRank" <=');
    expect(safetyPlanReader).not.toContain("boundedVersions.values.flatMap");
  });

  it("preserves the P10 cursor, total order, authorization scope and sentinel row", () => {
    const reader = readFileSync(
      join(process.cwd(), "src/infrastructure/persistence/prisma-operational-continuity-reader.ts"),
      "utf8",
    );
    const cursor = readFileSync(
      join(process.cwd(), "src/infrastructure/http/operational-continuity-cursor.ts"),
      "utf8",
    );
    expect(reader).toContain("LIMIT ${input.pageSize + 1}");
    expect(reader).toContain('item."sourceType" ASC');
    expect(reader).toContain('item."resourceId" ASC');
    expect(reader).toContain('episode."responsible_nurse_id" = ${input.principal.userId}');
    expect(reader).toContain('episode."responsible_clinician_id" = ${input.principal.userId}');
    expect(cursor).toContain("timingSafeEqual");
    expect(cursor).toContain("userId: input.userId");
    expect(cursor).toContain("roles: [...input.roles].sort()");
    expect(cursor).toContain("pageSize: input.pageSize");
  });
});
