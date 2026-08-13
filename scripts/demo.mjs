import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { readDemoFingerprint } from "./demo-state.mjs";
import {
  DemoCommandError,
  loadDemoEnvironment,
  manifest,
  readRuntimeState,
  repositoryRoot,
  runSync,
  safeErrorLine,
  spawnProcess,
  updateRuntimeState,
  validateDemoEnvironment,
  waitForHealth,
  writeRuntimeState,
} from "./demo-runtime.mjs";

function canonicalPath(value) {
  return path.resolve(value).replaceAll("\\", "/").toLowerCase();
}

async function createPrismaClient(databaseUrl) {
  const { PrismaClient } = await import("@prisma/client");
  return new PrismaClient({ datasources: { db: { url: databaseUrl } } });
}

export function inspectComposeContainer(environment) {
  const containerId = runSync("docker", ["compose", "ps", "-q", manifest.database.composeService], {
    environment,
    capture: true,
  }).trim();
  if (!containerId) throw new DemoCommandError("DEMO_POSTGRES_CONTAINER_MISSING", 3);
  const labelsText = runSync(
    "docker",
    ["inspect", "--format", "{{json .Config.Labels}}", containerId],
    { environment, capture: true },
  ).trim();
  let labels;
  try {
    labels = JSON.parse(labelsText);
  } catch {
    throw new DemoCommandError("DEMO_COMPOSE_LABELS_INVALID", 3);
  }
  const workingDirectory = labels["com.docker.compose.project.working_dir"];
  const configFiles = labels["com.docker.compose.project.config_files"] ?? "";
  if (
    labels["com.docker.compose.service"] !== manifest.database.composeService ||
    !workingDirectory ||
    canonicalPath(workingDirectory) !== canonicalPath(repositoryRoot) ||
    !configFiles
      .split(",")
      .map(canonicalPath)
      .includes(canonicalPath(path.join(repositoryRoot, "docker-compose.yml")))
  ) {
    throw new DemoCommandError("DEMO_COMPOSE_OWNERSHIP_NOT_PROVEN", 3);
  }
  return { containerId, project: labels["com.docker.compose.project"] };
}

function verifyStaticBoundary() {
  const compose = readFileSync(path.join(repositoryRoot, "docker-compose.yml"), "utf8");
  if (
    !/image:\s*postgres:16(?:-alpine)?/u.test(compose) ||
    !/127\.0\.0\.1:5432:5432/u.test(compose)
  ) {
    throw new DemoCommandError("DEMO_COMPOSE_BOUNDARY_DRIFT", 2);
  }
  const badgeSources = [
    "src/app/page.tsx",
    "src/presentation/components/app-shell.tsx",
    "src/application/sbar/generate-deterministic-sbar.ts",
  ];
  for (const relativePath of badgeSources) {
    if (!readFileSync(path.join(repositoryRoot, relativePath), "utf8").includes(manifest.notice)) {
      throw new DemoCommandError("DEMO_NOTICE_MISSING", 2);
    }
  }
  const healthSource = readFileSync(
    path.join(repositoryRoot, "src/app/api/health/route.ts"),
    "utf8",
  );
  if (
    !healthSource.includes('{ status: "ok", service: "guardian-alta-segura" }') ||
    /DATABASE_URL|password|token|cookie|diagnos|note/iu.test(healthSource)
  ) {
    throw new DemoCommandError("HEALTHCHECK_NOT_SANITIZED", 2);
  }
  const requestBoundary = readFileSync(
    path.join(repositoryRoot, "src/infrastructure/http/demo-episode-request.ts"),
    "utf8",
  );
  if (!requestBoundary.includes("assertLoopbackRequestHost(request)")) {
    throw new DemoCommandError("EFFECTIVE_HOST_GUARD_MISSING", 2);
  }

  const externalUrl =
    /https?:\/\/(?!\$\{|127\.0\.0\.1(?::\d+)?(?:[\s/.,;:'"`)]|$)|localhost(?::\d+)?(?:[\s/.,;:'"`)]|$)|\[::1\](?::\d+)?(?:[\s/.,;:'"`)]|$))[^\s'"`)]+/giu;
  const roots = ["src", "prisma", "scripts"];
  const pending = roots.map((item) => path.join(repositoryRoot, item));
  while (pending.length > 0) {
    const current = pending.pop();
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(absolute);
      else if (
        /\.(?:ts|tsx|mjs|json)$/u.test(entry.name) &&
        !/\.(?:test|spec)\./u.test(entry.name)
      ) {
        const source = readFileSync(absolute, "utf8");
        if (externalUrl.test(source))
          throw new DemoCommandError("EXTERNAL_RUNTIME_ENDPOINT_PRESENT", 2);
        externalUrl.lastIndex = 0;
      }
    }
  }
}

async function verifyDatabase(prisma) {
  const versionRows =
    await prisma.$queryRaw`SELECT current_setting('server_version_num')::integer AS version_number`;
  const versionNumber = Number(versionRows[0]?.version_number ?? 0);
  if (Math.floor(versionNumber / 10_000) !== manifest.database.postgresMajor) {
    throw new DemoCommandError("POSTGRES_MAJOR_VERSION_MISMATCH", 3);
  }

  const migrationRows = await prisma.$queryRaw`
    SELECT migration_name, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    ORDER BY migration_name
  `;
  const applied = migrationRows
    .filter(
      ({ finished_at: finishedAt, rolled_back_at: rolledBackAt }) => finishedAt && !rolledBackAt,
    )
    .map(({ migration_name: migrationName }) => migrationName);
  if (JSON.stringify(applied) !== JSON.stringify([...manifest.migrations].sort())) {
    throw new DemoCommandError("MIGRATION_SET_NOT_EXACT", 3);
  }

  const { state, fingerprint } = await readDemoFingerprint(prisma);
  return {
    fingerprint,
    state,
    postgresMajor: manifest.database.postgresMajor,
    migrations: applied.length,
  };
}

export async function verifyDemo({
  environment = loadDemoEnvironment(),
  allowAlternateDatabasePort = false,
  requireComposeOwnership = true,
  runTraceability = true,
  recordFingerprint = false,
} = {}) {
  validateDemoEnvironment(environment, { allowAlternateDatabasePort });
  verifyStaticBoundary();
  const compose = requireComposeOwnership ? inspectComposeContainer(environment) : null;
  const prisma = await createPrismaClient(environment.DATABASE_URL);
  let result;
  try {
    result = await verifyDatabase(prisma);
  } catch (error) {
    if (error instanceof DemoCommandError || error?.code === "DEMO_FLOW_STATE_DRIFT") throw error;
    if (error?.name === "DemoStateError") throw error;
    throw new DemoCommandError("POSTGRES_OR_DEMO_STATE_UNAVAILABLE", 3);
  } finally {
    await prisma.$disconnect();
  }
  if (runTraceability) runSync("pnpm", ["traceability:check"], { environment });
  if (recordFingerprint) {
    updateRuntimeState({ fingerprint: result.fingerprint, verifiedAt: new Date().toISOString() });
  }
  console.log(`DEMO_VERIFY=PASS`);
  console.log(`MIGRATIONS_APPLIED=${result.migrations}`);
  console.log(`POSTGRES_MAJOR=${result.postgresMajor}`);
  console.log(`SYNTHETIC_IDENTITIES=${result.state.identities.length}`);
  console.log(`EXTERNAL_PROVIDERS=0`);
  console.log(`SYNTHETIC_DEMO_FINGERPRINT=${result.fingerprint}`);
  if (compose) console.log(`COMPOSE_PROJECT=${compose.project}`);
  return result;
}

async function verifyResetOwnership(environment) {
  validateDemoEnvironment(environment);
  const compose = inspectComposeContainer(environment);
  const runtime = readRuntimeState();
  if (
    !runtime?.compose?.createdByP15 ||
    runtime.compose.containerId !== compose.containerId ||
    runtime.compose.project !== compose.project
  ) {
    throw new DemoCommandError("RESET_RESOURCE_NOT_CREATED_BY_P15", 5);
  }
  const prisma = await createPrismaClient(environment.DATABASE_URL);
  try {
    const aliases = await prisma.user.findMany({
      where: { syntheticAlias: { in: manifest.identities.map(({ alias }) => alias) } },
      select: { syntheticAlias: true, isSynthetic: true },
    });
    const markerPatient = await prisma.patient.count({
      where: { externalPseudonymousId: manifest.fixtures.patient, isSynthetic: true },
    });
    const markerEpisode = await prisma.dischargeEpisode.count({
      where: { id: manifest.fixtures.episode },
    });
    if (
      aliases.length !== manifest.identities.length ||
      !aliases.every(({ isSynthetic }) => isSynthetic) ||
      markerPatient !== 1 ||
      markerEpisode !== 1
    ) {
      throw new DemoCommandError("RESET_DATABASE_MARKER_NOT_PROVEN", 5);
    }
  } finally {
    await prisma.$disconnect();
  }
  return compose;
}

export async function resetDemo({ environment = loadDemoEnvironment(), confirmation } = {}) {
  if (confirmation !== "RESET_SYNTHETIC_DEMO") {
    throw new DemoCommandError("RESET_EXPLICIT_CONFIRMATION_REQUIRED", 5);
  }
  const compose = await verifyResetOwnership(environment);
  console.log("RESET_SCOPE=guardian_demo/public schema on loopback-only P15 Compose resource");
  console.log(`RESET_CONTAINER=${compose.containerId.slice(0, 12)}`);
  console.log("RESET_PRESERVES=volumes, other containers, other databases and repository files");
  runSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      manifest.database.composeService,
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      manifest.database.user,
      "-d",
      manifest.database.name,
      "-c",
      "DROP SCHEMA public CASCADE; CREATE SCHEMA public;",
    ],
    { environment },
  );
  runSync("pnpm", ["db:migrate:deploy"], { environment });
  runSync("pnpm", ["db:migrate:status"], { environment });
  runSync("pnpm", ["db:seed"], { environment });
  const result = await verifyDemo({ environment, recordFingerprint: true });
  console.log("DEMO_RESET=PASS");
  return result;
}

function processExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function cleanDemo({ environment = loadDemoEnvironment() } = {}) {
  validateDemoEnvironment(environment);
  const runtime = readRuntimeState();
  let appResult = "no P15 app process recorded";
  let postgresResult = "preserved (not created or started by P15)";
  const appPid =
    runtime?.app?.startedByP15 && Number.isInteger(runtime.app.pid) ? runtime.app.pid : null;
  writeRuntimeState({
    ...runtime,
    app: { startedByP15: false, pid: null },
    compose: runtime?.compose ? { ...runtime.compose, startedByP15: false } : undefined,
  });
  if (appPid !== null && processExists(appPid)) {
    process.kill(appPid, "SIGTERM");
    appResult = `stopped pid ${appPid}`;
  }
  if (runtime?.compose?.startedByP15) {
    const current = inspectComposeContainer(environment);
    if (current.containerId !== runtime.compose.containerId) {
      throw new DemoCommandError("CLEAN_CONTAINER_ID_MISMATCH", 6);
    }
    runSync("docker", ["compose", "stop", manifest.database.composeService], { environment });
    postgresResult = "stopped; data volume preserved";
  }
  console.log(`CLEAN_APP=${appResult}`);
  console.log(`CLEAN_POSTGRES=${postgresResult}`);
  console.log("CLEAN_DATA=preserved");
  console.log("DEMO_CLEAN=PASS");
}

export async function startDemo({ environment = loadDemoEnvironment() } = {}) {
  await verifyDemo({ environment });
  const nextCli = path.join(repositoryRoot, "node_modules", "next", "dist", "bin", "next");
  if (!existsSync(nextCli)) throw new DemoCommandError("NEXT_RUNTIME_MISSING", 4);
  const child = spawnProcess(process.execPath, [nextCli, "dev", "--hostname", "127.0.0.1"], {
    environment,
  });
  updateRuntimeState({ app: { startedByP15: true, pid: child.pid } });
  let stopping = false;
  const stop = (signal) => {
    if (stopping) return;
    stopping = true;
    if (child.exitCode === null) child.kill(signal);
  };
  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));
  try {
    await waitForHealth(manifest.appBaseUrl);
    console.log(`DEMO_START_READY=${manifest.appBaseUrl}`);
    const exit = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => resolve({ code, signal }));
    });
    const cleanedByP15 = readRuntimeState()?.app?.startedByP15 === false;
    if (exit.code !== 0 && !stopping && !cleanedByP15)
      throw new DemoCommandError("APPLICATION_EXITED_UNEXPECTEDLY", exit.code ?? 4);
  } finally {
    updateRuntimeState({ app: { startedByP15: false, pid: null } });
  }
}

export async function main(argv = process.argv.slice(2)) {
  const [command, ...args] = argv;
  if (command === "verify") return verifyDemo();
  if (command === "start") return startDemo();
  if (command === "reset") {
    const confirmation = args
      .find((item) => item.startsWith("--confirm="))
      ?.slice("--confirm=".length);
    return resetDemo({ confirmation });
  }
  if (command === "clean") return cleanDemo();
  throw new DemoCommandError("UNKNOWN_DEMO_COMMAND", 64);
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  main().catch((error) => {
    console.error(safeErrorLine(error));
    process.exitCode = error instanceof DemoCommandError ? error.exitCode : 1;
  });
}
