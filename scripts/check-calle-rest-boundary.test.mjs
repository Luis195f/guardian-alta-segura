import assert from "node:assert/strict";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { checkCallERestBoundary } from "./check-calle-rest-boundary.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(root) {
  const stdout = [];
  const stderr = [];
  const status = checkCallERestBoundary({
    repositoryRoot: root,
    stdout: (message) => stdout.push(message),
    stderr: (message) => stderr.push(message),
  });
  return { status, stdout: stdout.join("\n"), stderr: stderr.join("\n") };
}

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "gas-c02-rest-boundary-"));
  for (const relative of ["package.json", "pnpm-lock.yaml", "src"]) {
    cpSync(path.join(repositoryRoot, relative), path.join(root, relative), { recursive: true });
  }
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test("accepts the disabled server-only REST boundary", () => {
  const result = run(repositoryRoot);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /SDK absent/u);
});

test("rejects replacing either exact local synthetic Relay provider", (t) => {
  const root = fixture(t);
  for (const [relativePath, exactProvider, replacement] of [
    [
      "src/infrastructure/relay/synthetic-demo-patient-relay.ts",
      "new LocalSyntheticPatientRelayProvider()",
      "new EscapedPatientRelayProvider()",
    ],
    [
      "src/infrastructure/relay/synthetic-demo-professional-relay.ts",
      "new LocalSyntheticProfessionalRelayProvider()",
      "new EscapedProfessionalRelayProvider()",
    ],
  ]) {
    const file = path.join(root, relativePath);
    writeFileSync(file, readFileSync(file, "utf8").replace(exactProvider, replacement));
  }
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Synthetic Patient Relay executor/u);
  assert.match(result.stderr, /Synthetic Professional Relay executor/u);
});

test("rejects a provider SDK import in production", (t) => {
  const root = fixture(t);
  const file = path.join(root, "src", "domain", "prohibited-provider.ts");
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `import "${"@call-e/calle"}";\n`);
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Prohibited production token/u);
});

test("rejects prohibited provider surfaces and a presentation entrypoint", (t) => {
  const root = fixture(t);
  const adapter = path.join(
    root,
    "src",
    "infrastructure",
    "call-transport",
    "call-e-rest-adapter.ts",
  );
  writeFileSync(
    adapter,
    `${readFileSync(adapter, "utf8")}\nconst forbidden = "/v1/calls/${"batch"}";\n`,
  );
  const route = path.join(root, "src", "app", "api", "call", "route.ts");
  mkdirSync(path.dirname(route), { recursive: true });
  writeFileSync(route, `import "@/infrastructure/${"call-e-rest"}";\n`);
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Prohibited production token/u);
  assert.match(result.stderr, /Live CALL-E entrypoint/u);
});

test("rejects disguised CALL-E webhook ingress paths and configuration", (t) => {
  const root = fixture(t);
  const route = path.join(root, "src", "app", "api", "provider", "webhook", "route.ts");
  mkdirSync(path.dirname(route), { recursive: true });
  writeFileSync(route, "export function POST() { return new Response(null, { status: 204 }); }\n");
  const config = path.join(root, "src", "infrastructure", "config", "provider-ingress.ts");
  mkdirSync(path.dirname(config), { recursive: true });
  writeFileSync(config, `export const ${"CALL_E_WEBHOOK_SECRET"} = "disabled";\n`);
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ingress route/u);
  assert.match(result.stderr, /ingress configuration/u);
});

test("rejects any extra route hidden under the synthetic Patient Relay namespace", (t) => {
  const root = fixture(t);
  const route = path.join(
    root,
    "src",
    "app",
    "api",
    "demo",
    "discharge-episodes",
    "[episodeId]",
    "patient-relay",
    "live",
    "route.ts",
  );
  mkdirSync(path.dirname(route), { recursive: true });
  writeFileSync(route, `import "@/application/relay/${"manage-continuity-relay"}";\n`);
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unexpected file in synthetic Patient Relay route namespace/u);
  assert.match(result.stderr, /Live CALL-E entrypoint/u);
});

test("rejects network transport injected into an exact synthetic Patient Relay route", (t) => {
  const root = fixture(t);
  const route = path.join(
    root,
    "src",
    "app",
    "api",
    "demo",
    "discharge-episodes",
    "[episodeId]",
    "patient-relay",
    "preview",
    "route.ts",
  );
  writeFileSync(
    route,
    `${readFileSync(route, "utf8")}\nvoid ${"fetch"}("https://example.invalid");\n`,
  );
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Provider runtime escaped into synthetic demo route/u);
});

test("rejects network transport injected into the local synthetic executor", (t) => {
  const root = fixture(t);
  const executor = path.join(
    root,
    "src",
    "infrastructure",
    "relay",
    "synthetic-demo-patient-relay.ts",
  );
  writeFileSync(
    executor,
    `${readFileSync(executor, "utf8")}\nvoid ${"fetch"}("https://example.invalid");\n`,
  );
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /exact local no-network implementation/u);
});

test("rejects extra or networked Professional Relay demo surfaces", (t) => {
  const root = fixture(t);
  const extraRoute = path.join(
    root,
    "src",
    "app",
    "api",
    "demo",
    "discharge-episodes",
    "[episodeId]",
    "professional-relay",
    "live",
    "route.ts",
  );
  mkdirSync(path.dirname(extraRoute), { recursive: true });
  writeFileSync(extraRoute, `void ${"fetch"}("https://example.invalid");\n`);
  const executor = path.join(
    root,
    "src",
    "infrastructure",
    "relay",
    "synthetic-demo-professional-relay.ts",
  );
  writeFileSync(
    executor,
    `${readFileSync(executor, "utf8")}\nvoid ${"fetch"}("https://example.invalid");\n`,
  );
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unexpected file in synthetic Professional Relay route namespace/u);
  assert.match(result.stderr, /Provider runtime escaped into synthetic demo route/u);
  assert.match(result.stderr, /Synthetic Professional Relay executor/u);
});

test("rejects aliased fetch and bare HTTP transport imports in Professional Relay", (t) => {
  const root = fixture(t);
  const route = path.join(
    root,
    "src",
    "app",
    "api",
    "demo",
    "discharge-episodes",
    "[episodeId]",
    "professional-relay",
    "preview",
    "route.ts",
  );
  writeFileSync(
    route,
    `${readFileSync(route, "utf8")}\nconst send = globalThis["${"fetch"}"];\nvoid send;\n`,
  );
  const executor = path.join(
    root,
    "src",
    "infrastructure",
    "relay",
    "synthetic-demo-professional-relay.ts",
  );
  writeFileSync(
    executor,
    `${readFileSync(executor, "utf8")}\nimport transport from "${"https"}";\nvoid transport;\n`,
  );
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Provider runtime escaped into synthetic demo route/u);
  assert.match(result.stderr, /Synthetic Professional Relay executor/u);
});
