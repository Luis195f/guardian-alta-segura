import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { fingerprintDemoMaterialState, stableJson } from "./demo-state.mjs";
import { resetDemo, startDemo, verifyDemo, verifyStaticBoundary } from "./demo.mjs";
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
  CALL_E_REST_ENABLED: "false",
};

function writeFixtureFile(root, relativePath, content) {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
  return target;
}

function staticBoundaryFixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "gas-p15-static-boundary-"));
  writeFixtureFile(
    root,
    "docker-compose.yml",
    "services:\n  postgres:\n    image: postgres:16-alpine\n    ports:\n      - 127.0.0.1:5432:5432\n",
  );
  for (const relativePath of [
    "src/app/page.tsx",
    "src/presentation/components/app-shell.tsx",
    "src/application/sbar/generate-deterministic-sbar.ts",
  ]) {
    writeFixtureFile(root, relativePath, manifest.notice);
  }
  writeFixtureFile(
    root,
    "src/app/api/health/route.ts",
    'const payload = { status: "ok", service: "guardian-alta-segura" };\n',
  );
  writeFixtureFile(
    root,
    "src/infrastructure/http/demo-episode-request.ts",
    "assertLoopbackRequestHost(request);\n",
  );
  writeFixtureFile(
    root,
    "src/infrastructure/call-transport/call-e-rest-config.ts",
    'export const CALL_E_API_BASE_URL = "https://api.heycall-e.com" as const;\n',
  );
  mkdirSync(path.join(root, "prisma"), { recursive: true });
  mkdirSync(path.join(root, "scripts"), { recursive: true });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function expectExternalEndpointFailure(root) {
  assert.throws(
    () => verifyStaticBoundary(root),
    (error) =>
      error instanceof DemoCommandError && error.code === "EXTERNAL_RUNTIME_ENDPOINT_PRESENT",
  );
}

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

test("CALL_E_REST_ENABLED=false es obligatorio para verify y start antes del runtime", async () => {
  assert.equal(validateDemoEnvironment(validEnvironment).hostname, "127.0.0.1");
  for (const value of [undefined, "true", "invalid"]) {
    const environment = { ...validEnvironment, CALL_E_REST_ENABLED: value };
    if (value === undefined) delete environment.CALL_E_REST_ENABLED;
    for (const operation of [verifyDemo, startDemo]) {
      await assert.rejects(
        operation({ environment }),
        (error) =>
          error instanceof DemoCommandError &&
          error.code === "DEMO_FLAG_INVALID:CALL_E_REST_ENABLED",
      );
    }
  }
});

test("acepta exactamente una constante CALL_E_API_BASE_URL canónica", (t) => {
  assert.doesNotThrow(() => verifyStaticBoundary(staticBoundaryFixture(t)));
});

test("rechaza el endpoint CALL-E canónico fuera del archivo autorizado", (t) => {
  const root = staticBoundaryFixture(t);
  writeFixtureFile(
    root,
    "src/domain/escaped-endpoint.ts",
    'export const escaped = "https://api.heycall-e.com";\n',
  );
  expectExternalEndpointFailure(root);
});

for (const endpoint of [
  "http://api.heycall-e.com",
  "https://heycall-e.com",
  "https://api.heycall-e.com:443",
  "https://api.heycall-e.com/v1",
  "https://sandbox.api.heycall-e.com",
]) {
  test(`rechaza protocolo, host, puerto, path o subdominio distinto: ${endpoint}`, (t) => {
    const root = staticBoundaryFixture(t);
    const config = path.join(root, "src/infrastructure/call-transport/call-e-rest-config.ts");
    writeFileSync(
      config,
      readFileSync(config, "utf8").replace("https://api.heycall-e.com", endpoint),
    );
    expectExternalEndpointFailure(root);
  });
}

test("rechaza la URL canónica si cambia el símbolo exacto", (t) => {
  const root = staticBoundaryFixture(t);
  const config = path.join(root, "src/infrastructure/call-transport/call-e-rest-config.ts");
  writeFileSync(
    config,
    readFileSync(config, "utf8").replace("CALL_E_API_BASE_URL", "CALL_E_BASE_URL"),
  );
  expectExternalEndpointFailure(root);
});

test("rechaza una segunda URL externa en el archivo autorizado", (t) => {
  const root = staticBoundaryFixture(t);
  const config = path.join(root, "src/infrastructure/call-transport/call-e-rest-config.ts");
  writeFileSync(
    config,
    `${readFileSync(config, "utf8")}const other = "https://example.invalid";\n`,
  );
  expectExternalEndpointFailure(root);
});

test("rechaza una segunda aparición del endpoint autorizado", (t) => {
  const root = staticBoundaryFixture(t);
  const config = path.join(root, "src/infrastructure/call-transport/call-e-rest-config.ts");
  writeFileSync(
    config,
    `${readFileSync(config, "utf8")}const duplicate = "https://api.heycall-e.com";\n`,
  );
  expectExternalEndpointFailure(root);
});

for (const [rootName, relativePath] of [
  ["src", "src/domain/external.ts"],
  ["prisma", "prisma/external.sql"],
  ["scripts", "scripts/external.mjs"],
]) {
  test(`rechaza cualquier URL externa añadida a ${rootName}`, (t) => {
    const root = staticBoundaryFixture(t);
    writeFixtureFile(root, relativePath, 'const external = "https://example.invalid";\n');
    expectExternalEndpointFailure(root);
  });
}

test("mantiene permitidas las URLs loopback canónicas", (t) => {
  const root = staticBoundaryFixture(t);
  writeFixtureFile(
    root,
    "scripts/loopback.mjs",
    [
      'const ipv4 = "http://127.0.0.1:3000/api/health";',
      'const local = "http://localhost:3000/api/health";',
      'const ipv6 = "http://[::1]:3000/api/health";',
    ].join("\n"),
  );
  assert.doesNotThrow(() => verifyStaticBoundary(root));
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

test("el manifiesto enumera exactamente las migraciones versionadas", () => {
  const migrations = readdirSync(path.join(repositoryRoot, "prisma", "migrations"), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map(({ name }) => name)
    .sort();
  assert.deepEqual([...manifest.migrations].sort(), migrations);
  assert.equal(migrations.length, 20);
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
  assert.match(source, /EXTERNAL_PROVIDER_CALLS=0/u);
  assert.doesNotMatch(source, /EXTERNAL_PROVIDERS=0/u);
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
