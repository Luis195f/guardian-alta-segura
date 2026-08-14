import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { checkGovernanceEvidence } from "./check-governance-evidence.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function copyRelative(fixtureRoot, relativePath) {
  const source = path.join(repositoryRoot, relativePath);
  const destination = path.join(fixtureRoot, relativePath);
  mkdirSync(path.dirname(destination), { recursive: true });
  copyFileSync(source, destination);
}

function createFixture(t) {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "gas-p11-governance-"));
  const requiredFiles = [
    "docs/audit/gas2-claims-register.md",
    "docs/audit/gas2-evidence-index.md",
    "docs/requirements-traceability.csv",
    "docs/decision-register.md",
    "docs/clinical-safety/dcb0129/hazard-log-initial.md",
    "docs/system-assurance-boundary.md",
  ];
  requiredFiles.forEach((relativePath) => copyRelative(fixtureRoot, relativePath));

  const claims = readFileSync(path.join(repositoryRoot, requiredFiles[0]), "utf8");
  for (const match of claims.matchAll(/`([^`]+\.(?:ts|tsx|mjs))`/gu)) {
    copyRelative(fixtureRoot, match[1]);
  }
  t.after(() => rmSync(fixtureRoot, { recursive: true, force: true }));
  return fixtureRoot;
}

function run(fixtureRoot) {
  const stdout = [];
  const stderr = [];
  const status = checkGovernanceEvidence({
    repositoryRoot: fixtureRoot,
    stdout: (message) => stdout.push(message),
    stderr: (message) => stderr.push(message),
  });
  return { status, stdout: stdout.join("\n"), stderr: stderr.join("\n") };
}

test("acepta el registro canónico con taxonomía y referencias verificables", (t) => {
  const result = run(createFixture(t));
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /claims usan exclusivamente la taxonomía autorizada/u);
});

test("rechaza una taxonomía histórica no autorizada", (t) => {
  const fixtureRoot = createFixture(t);
  const claimsPath = path.join(fixtureRoot, "docs", "audit", "gas2-claims-register.md");
  writeFileSync(
    claimsPath,
    readFileSync(claimsPath, "utf8").replace(
      "| CLAIM-GAS2-001 | “Technical pre-pilot MVP using synthetic data only” | README/product copy | Loopback/demo gates, synthetic seed and local validation | `IMPLEMENTED_AND_TESTED` |",
      "| CLAIM-GAS2-001 | “Technical pre-pilot MVP using synthetic data only” | README/product copy | Loopback/demo gates, synthetic seed and local validation | `SUPPORTED_TECHNICAL_CLAIM` |",
    ),
  );
  const result = run(fixtureRoot);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Clasificación no autorizada/u);
});

test("rechaza referencias REQ, DEC, hazard y prueba rotas", (t) => {
  const fixtureRoot = createFixture(t);
  const claimsPath = path.join(fixtureRoot, "docs", "audit", "gas2-claims-register.md");
  const claims = readFileSync(claimsPath, "utf8")
    .replace("REQ-01", "REQ-99")
    .replace("DEC-016", "DEC-999")
    .replace("HAZ-GAS-008", "HAZ-GAS-999")
    .replace("tests/e2e/demo-smoke.p15.ts", "tests/e2e/missing-p11.spec.ts");
  writeFileSync(claimsPath, claims);
  const result = run(fixtureRoot);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /REQ rota/u);
  assert.match(result.stderr, /DEC rota/u);
  assert.match(result.stderr, /hazard roto/u);
  assert.match(result.stderr, /referencia de prueba rota/u);
});

test("rechaza un SHA no completo", (t) => {
  const fixtureRoot = createFixture(t);
  const claimsPath = path.join(fixtureRoot, "docs", "audit", "gas2-claims-register.md");
  writeFileSync(
    claimsPath,
    readFileSync(claimsPath, "utf8").replace("5c6a0b61d341b573c3dac9b0a12c0d229fdd288b", "5c6a0b6"),
  );
  const result = run(fixtureRoot);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /SHA completo válido/u);
});
