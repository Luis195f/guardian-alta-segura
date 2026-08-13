import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { fingerprintDemoMaterialState, stableJson } from "./demo-state.mjs";
import { resetDemo } from "./demo.mjs";
import {
  DemoCommandError,
  manifest,
  parseEnvironmentText,
  repositoryRoot,
  validateDemoEnvironment,
} from "./demo-runtime.mjs";

const validEnvironment = {
  DATABASE_URL: "postgresql://guardian_demo:synthetic@127.0.0.1:5432/guardian_demo?schema=public",
  APP_BASE_URL: "http://127.0.0.1:3000",
  DEMO_MODE: "true",
  EXPLAINABLE_TRAFFIC_LIGHT: "false",
  COMMITMENT_ENGINE_ENABLED: "false",
};

test("el manifiesto reserva seis identidades con un único rol distinto", () => {
  assert.equal(manifest.identities.length, 6);
  assert.equal(new Set(manifest.identities.map(({ alias }) => alias)).size, 6);
  assert.equal(new Set(manifest.identities.map(({ role }) => role)).size, 6);
  assert.deepEqual(manifest.identities.map(({ alias }) => alias).sort(), [
    "demo-admin",
    "demo-caregiver",
    "demo-clinician",
    "demo-nurse",
    "demo-patient",
    "demo-support",
  ]);
});

test("valida el entorno canónico y rechaza APP_BASE_URL externa, LAN y 0.0.0.0", () => {
  assert.equal(validateDemoEnvironment(validEnvironment).hostname, "127.0.0.1");
  for (const APP_BASE_URL of [
    "https://example.invalid",
    "http://192.168.1.20:3000",
    "http://0.0.0.0:3000",
    "http://localhost:3000",
  ]) {
    assert.throws(
      () => validateDemoEnvironment({ ...validEnvironment, APP_BASE_URL }),
      (error) =>
        error instanceof DemoCommandError && error.code === "APP_BASE_URL_NOT_CANONICAL_LOOPBACK",
    );
  }
});

test("rechaza bases remotas, no reconocidas o con identidad diferente", () => {
  for (const DATABASE_URL of [
    "postgresql://guardian_demo:x@db.example.invalid:5432/guardian_demo",
    "postgresql://guardian_demo:x@192.168.1.20:5432/guardian_demo",
    "postgresql://postgres:x@127.0.0.1:5432/postgres",
  ]) {
    assert.throws(
      () => validateDemoEnvironment({ ...validEnvironment, DATABASE_URL }),
      (error) =>
        error instanceof DemoCommandError && error.code === "DATABASE_TARGET_NOT_CANONICAL_DEMO",
    );
  }
});

test("el parser preserva valores explícitos sin evaluar comandos ni mostrar secretos", () => {
  const parsed = parseEnvironmentText(
    'DEMO_MODE="true"\nAPP_BASE_URL="http://127.0.0.1:3000"\nIGNORED=$(danger)\n',
  );
  assert.deepEqual(parsed, {
    DEMO_MODE: "true",
    APP_BASE_URL: "http://127.0.0.1:3000",
    IGNORED: "$(danger)",
  });
});

test("reset falla antes de cualquier acceso sin confirmación contractual exacta", async () => {
  await assert.rejects(
    resetDemo({ environment: validEnvironment }),
    (error) =>
      error instanceof DemoCommandError && error.code === "RESET_EXPLICIT_CONFIRMATION_REQUIRED",
  );
  await assert.rejects(
    resetDemo({ environment: validEnvironment, confirmation: "yes" }),
    (error) =>
      error instanceof DemoCommandError && error.code === "RESET_EXPLICIT_CONFIRMATION_REQUIRED",
  );
});

test("fingerprint es estable ante orden de claves y cambia ante deriva material", () => {
  const left = { roles: ["nurse"], fixture: { state: "DRAFT", enabled: false } };
  const reordered = { fixture: { enabled: false, state: "DRAFT" }, roles: ["nurse"] };
  assert.equal(stableJson(left), stableJson(reordered));
  assert.equal(fingerprintDemoMaterialState(left), fingerprintDemoMaterialState(reordered));
  assert.notEqual(
    fingerprintDemoMaterialState(left),
    fingerprintDemoMaterialState({ ...left, fixture: { state: "ACTIVE", enabled: false } }),
  );
});

test("contrato público usa Node, sin shell y con los cinco comportamientos inequívocos", () => {
  const packageJson = JSON.parse(readFileSync(path.join(repositoryRoot, "package.json"), "utf8"));
  for (const command of ["verify", "start", "reset", "clean"]) {
    assert.equal(packageJson.scripts[`demo:${command}`], `node scripts/demo.mjs ${command}`);
  }
  assert.equal(packageJson.scripts["demo:smoke"], "node scripts/smoke-demo.mjs");
  for (const script of Object.entries(packageJson.scripts)
    .filter(([name]) => name.startsWith("demo:"))
    .map(([, value]) => value)) {
    assert.doesNotMatch(script, /pwsh|powershell|cmd\.exe|bash|zsh/iu);
  }
  const runtime = readFileSync(path.join(repositoryRoot, "scripts", "demo-runtime.mjs"), "utf8");
  assert.match(runtime, /shell: false/u);
});

test("Prisma y seed solo aceptan override explícito P15 para aislamiento y cwd distinto", () => {
  const prismaConfig = readFileSync(path.join(repositoryRoot, "prisma.config.ts"), "utf8");
  const seed = readFileSync(path.join(repositoryRoot, "prisma", "seed.mjs"), "utf8");
  assert.match(prismaConfig, /process\.env\.P15_DATABASE_URL_OVERRIDE/u);
  assert.match(seed, /process\.env\.P15_DATABASE_URL_OVERRIDE/u);
  assert.match(prismaConfig, /delete process\.env\.DATABASE_URL/u);
  assert.match(seed, /delete process\.env\.DATABASE_URL/u);
});

test("start enlaza loopback y reset queda detrás de ownership y confirmación", () => {
  const source = readFileSync(path.join(repositoryRoot, "scripts", "demo.mjs"), "utf8");
  assert.match(source, /"--hostname", "127\.0\.0\.1"/u);
  assert.ok(
    source.indexOf("RESET_EXPLICIT_CONFIRMATION_REQUIRED") <
      source.indexOf("DROP SCHEMA public CASCADE"),
  );
  assert.ok(source.indexOf("verifyResetOwnership") < source.indexOf("DROP SCHEMA public CASCADE"));
  assert.doesNotMatch(source, /migrate reset|--force|shell:\s*true/iu);
});

test("matriz pública usa exactamente la taxonomía P15 y conserva gates institucionales", () => {
  assert.deepEqual(
    manifest.capabilities.map(({ status }) => status),
    ["IMPLEMENTADO", "SIMULADO", "DOCUMENTADO", "FUTURO-NO_AUTORIZADO"],
  );
  const component = readFileSync(
    path.join(repositoryRoot, "src", "presentation", "components", "demo-capability-matrix.tsx"),
    "utf8",
  );
  assert.match(component, /DEC-016 = Pendiente/u);
  assert.match(component, /REAL PILOT = NO_GO/u);
  assert.match(
    component,
    /sin respaldo\s+institucional ni validación clínica, jurídica, RGPD, MDR o AI Act/u,
  );
});
