import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { CommandFailedError, prepareDemo } from "./prepare-demo.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validEnvironment = [
  'DATABASE_URL="postgresql://guardian_demo:synthetic@127.0.0.1:5432/guardian_demo?schema=public"',
  'POSTGRES_PASSWORD="synthetic"',
  'APP_BASE_URL="http://127.0.0.1:3000"',
  'DEMO_MODE="true"',
  'DEMO_SESSION_TTL_HOURS="8"',
  'CAREGIVER_DEMO_INVITATION_TTL_MINUTES="30"',
  'CAREGIVER_DEMO_SESSION_TTL_HOURS="8"',
  'SESSION_COOKIE_SECURE="false"',
  'EXPLAINABLE_TRAFFIC_LIGHT="false"',
  "",
].join("\n");

function createDemoRoot(t) {
  const root = mkdtempSync(path.join(tmpdir(), "gas-x2-demo-"));
  writeFileSync(path.join(root, ".env.example"), validEnvironment);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function recordingRunner(calls, postgresContainer = "") {
  return (executable, args, options) => {
    calls.push({ executable, args: [...args], options });
    return args.join(" ") === "compose ps -q postgres" ? postgresContainer : "";
  };
}

test("crea .env desde el ejemplo solo cuando falta y carga sus variables", (t) => {
  const root = createDemoRoot(t);
  const environment = {};
  const calls = [];
  prepareDemo({
    repositoryRoot: root,
    environment,
    commandRunner: recordingRunner(calls),
    log: () => {},
  });

  assert.equal(readFileSync(path.join(root, ".env"), "utf8"), validEnvironment);
  assert.equal(environment.APP_BASE_URL, "http://127.0.0.1:3000");
  assert.equal(environment.POSTGRES_PASSWORD, "synthetic");
});

test("preserva byte a byte un .env preexistente", (t) => {
  const root = createDemoRoot(t);
  const existingEnvironment = `# marker preserved\n${validEnvironment}`;
  writeFileSync(path.join(root, ".env"), existingEnvironment);

  prepareDemo({
    repositoryRoot: root,
    environment: {},
    commandRunner: recordingRunner([], "container-id\n"),
    log: () => {},
  });
  assert.equal(readFileSync(path.join(root, ".env"), "utf8"), existingEnvironment);
});

test("rechaza APP_BASE_URL no loopback antes de ejecutar subprocesos", (t) => {
  const root = createDemoRoot(t);
  writeFileSync(
    path.join(root, ".env"),
    validEnvironment.replace("http://127.0.0.1:3000", "http://192.0.2.1:3000"),
  );
  const calls = [];

  assert.throws(
    () =>
      prepareDemo({
        repositoryRoot: root,
        environment: {},
        commandRunner: recordingRunner(calls),
        log: () => {},
      }),
    /requires APP_BASE_URL=http:\/\/127\.0\.0\.1:3000/u,
  );
  assert.deepEqual(calls, []);
});

test("rechaza cualquier aparición de 0.0.0.0", (t) => {
  const root = createDemoRoot(t);
  writeFileSync(path.join(root, ".env"), validEnvironment.replace("127.0.0.1", "0.0.0.0"));

  assert.throws(
    () =>
      prepareDemo({
        repositoryRoot: root,
        environment: {},
        commandRunner: recordingRunner([]),
        log: () => {},
      }),
    /refuses 0\.0\.0\.0/u,
  );
});

test("propaga el fallo de un subproceso y detiene la secuencia", (t) => {
  const root = createDemoRoot(t);
  const calls = [];
  let propagated;
  try {
    prepareDemo({
      repositoryRoot: root,
      environment: {},
      commandRunner: (executable, args, options) => {
        calls.push({ executable, args: [...args], options });
        if (args[0] === "prisma:generate") {
          throw new CommandFailedError(executable, args, 7);
        }
        return "";
      },
      log: () => {},
    });
  } catch (error) {
    propagated = error;
  }

  assert.ok(propagated instanceof CommandFailedError);
  assert.equal(propagated.exitCode, 7);
  assert.equal(calls.at(-1).args[0], "prisma:generate");
  assert.equal(
    calls.some(({ args }) => args[0] === "db:migrate:deploy"),
    false,
  );
});

test("usa Docker Compose sin shell ni operaciones destructivas", (t) => {
  const root = createDemoRoot(t);
  const calls = [];
  prepareDemo({
    repositoryRoot: root,
    environment: {},
    commandRunner: recordingRunner(calls),
    log: () => {},
  });

  assert.deepEqual(calls[0].args, ["compose", "ps", "-q", "postgres"]);
  assert.deepEqual(calls[1].args, ["compose", "up", "-d", "postgres"]);
  assert.equal(
    calls.some(({ args }) => args.includes("down") || args.includes("--volumes")),
    false,
  );
  assert.deepEqual(
    calls.filter(({ executable }) => executable === "pnpm").map(({ args }) => args),
    [
      ["install", "--frozen-lockfile"],
      ["prisma:generate"],
      ["db:migrate:deploy"],
      ["db:migrate:status"],
      ["db:seed"],
      ["traceability:check"],
    ],
  );
});

test("arranca el contenedor existente en vez de crear otro", (t) => {
  const root = createDemoRoot(t);
  const calls = [];
  prepareDemo({
    repositoryRoot: root,
    environment: {},
    commandRunner: recordingRunner(calls, "container-id\n"),
    log: () => {},
  });
  assert.deepEqual(calls[1].args, ["compose", "start", "postgres"]);
});

test("los comandos públicos no usan PowerShell y los wrappers no duplican lógica", () => {
  const packageJson = JSON.parse(readFileSync(path.join(repositoryRoot, "package.json"), "utf8"));
  for (const scriptName of ["traceability:check", "demo:prepare"]) {
    assert.match(packageJson.scripts[scriptName], /^node scripts\/[a-z-]+\.mjs$/u);
    assert.doesNotMatch(packageJson.scripts[scriptName], /pwsh|powershell|cmd\.exe|bash|zsh/iu);
  }

  for (const wrapperName of ["check-requirements-traceability.ps1", "prepare-demo.ps1"]) {
    const wrapper = readFileSync(path.join(repositoryRoot, "scripts", wrapperName), "utf8");
    assert.equal(wrapper.split(/\r?\n/u).filter(Boolean).length, 3);
    assert.match(wrapper, /& node/u);
    assert.doesNotMatch(wrapper, /docker|Copy-Item|canonicalRequirements|Import-Csv/iu);
  }

  const implementation = readFileSync(
    path.join(repositoryRoot, "scripts", "prepare-demo.mjs"),
    "utf8",
  );
  assert.match(implementation, /shell: false/u);
});
