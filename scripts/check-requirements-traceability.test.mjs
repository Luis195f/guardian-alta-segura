import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceScript = path.join(repositoryRoot, "scripts", "check-requirements-traceability.mjs");

function createFixture(t) {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "gas-x2-traceability-"));
  const scriptsDirectory = path.join(fixtureRoot, "scripts");
  const docsDirectory = path.join(fixtureRoot, "docs");
  mkdirSync(scriptsDirectory);
  mkdirSync(docsDirectory);
  copyFileSync(sourceScript, path.join(scriptsDirectory, path.basename(sourceScript)));
  for (const fileName of ["requirements-traceability.csv", "requirements-traceability.md"]) {
    copyFileSync(path.join(repositoryRoot, "docs", fileName), path.join(docsDirectory, fileName));
  }
  t.after(() => rmSync(fixtureRoot, { recursive: true, force: true }));
  return fixtureRoot;
}

function runFixture(fixtureRoot, cwd = fixtureRoot) {
  return spawnSync(
    process.execPath,
    [path.join(fixtureRoot, "scripts", "check-requirements-traceability.mjs")],
    { cwd, encoding: "utf8", shell: false },
  );
}

test("acepta Markdown y CSV canónicos y coherentes con exit 0", (t) => {
  const fixtureRoot = createFixture(t);
  const result = runFixture(fixtureRoot);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /REQ-01 a REQ-14 son únicos/u);
});

test("detecta drift Markdown/CSV en fixture temporal con exit 1", (t) => {
  const fixtureRoot = createFixture(t);
  const markdownPath = path.join(fixtureRoot, "docs", "requirements-traceability.md");
  writeFileSync(
    markdownPath,
    readFileSync(markdownPath, "utf8").replace("Alta Estructurada", "Alta con deriva"),
  );

  const result = runFixture(fixtureRoot);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Diferencia semántica|altera 'Título'/u);
});

test("rechaza una referencia de requisito rota con exit 1", (t) => {
  const fixtureRoot = createFixture(t);
  for (const fileName of ["requirements-traceability.csv", "requirements-traceability.md"]) {
    const filePath = path.join(fixtureRoot, "docs", fileName);
    writeFileSync(filePath, readFileSync(filePath, "utf8").replaceAll("REQ-14", "REQ-99"));
  }

  const result = runFixture(fixtureRoot);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /REQ-14/u);
  assert.match(result.stderr, /REQ-99/u);
});

test("resuelve el repositorio desde el script aunque el cwd sea distinto", (t) => {
  const fixtureRoot = createFixture(t);
  const foreignCwd = mkdtempSync(path.join(tmpdir(), "gas-x2-cwd-"));
  t.after(() => rmSync(foreignCwd, { recursive: true, force: true }));

  const result = runFixture(fixtureRoot, foreignCwd);
  assert.equal(result.status, 0, result.stderr);
});
