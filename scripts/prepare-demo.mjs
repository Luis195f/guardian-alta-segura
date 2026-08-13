import { copyFileSync, constants, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const environmentVariableNames = [
  "DATABASE_URL",
  "POSTGRES_PASSWORD",
  "APP_BASE_URL",
  "DEMO_MODE",
  "DEMO_SESSION_TTL_HOURS",
  "CAREGIVER_DEMO_INVITATION_TTL_MINUTES",
  "CAREGIVER_DEMO_SESSION_TTL_HOURS",
  "SESSION_COOKIE_SECURE",
  "EXPLAINABLE_TRAFFIC_LIGHT",
  "COMMITMENT_ENGINE_ENABLED",
];

function resolvePnpmInvocation(args, environment) {
  const npmExecutablePath = environment.npm_execpath;
  if (npmExecutablePath && existsSync(npmExecutablePath)) {
    return { executable: process.execPath, args: [npmExecutablePath, ...args] };
  }

  const corepackPnpmPath = path.join(
    path.dirname(process.execPath),
    "node_modules",
    "corepack",
    "dist",
    "pnpm.js",
  );
  if (existsSync(corepackPnpmPath)) {
    return { executable: process.execPath, args: [corepackPnpmPath, ...args] };
  }

  return { executable: "pnpm", args };
}

export class CommandFailedError extends Error {
  constructor(executable, args, exitCode, cause) {
    super(`Command failed: ${executable} ${args.join(" ")}`, { cause });
    this.name = "CommandFailedError";
    this.exitCode = exitCode;
  }
}

export function runCommand(executable, args, { cwd, environment, captureOutput = false }) {
  const invocation =
    executable === "pnpm"
      ? resolvePnpmInvocation(args, environment)
      : { executable, args: [...args] };
  const result = spawnSync(invocation.executable, invocation.args, {
    cwd,
    env: environment,
    encoding: "utf8",
    shell: false,
    stdio: captureOutput ? ["inherit", "pipe", "inherit"] : "inherit",
  });

  if (result.error || result.status !== 0) {
    throw new CommandFailedError(executable, args, result.status ?? 1, result.error);
  }
  return captureOutput ? (result.stdout ?? "") : "";
}

export function ensureEnvironmentFile(repositoryRoot, log = console.log) {
  const environmentPath = path.join(repositoryRoot, ".env");
  if (!existsSync(environmentPath)) {
    copyFileSync(
      path.join(repositoryRoot, ".env.example"),
      environmentPath,
      constants.COPYFILE_EXCL,
    );
    log("Created .env from the synthetic local template.");
  }
  return environmentPath;
}

export function loadDemoEnvironment(environmentPath, environment = process.env) {
  const environmentText = readFileSync(environmentPath, "utf8");
  if (
    !/APP_BASE_URL="http:\/\/127\.0\.0\.1:3000"/u.test(environmentText) ||
    /0\.0\.0\.0/u.test(environmentText)
  ) {
    throw new Error(
      "Demo preparation requires APP_BASE_URL=http://127.0.0.1:3000 and refuses 0.0.0.0.",
    );
  }

  for (const variableName of environmentVariableNames) {
    const escapedName = variableName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const match = environmentText.match(new RegExp(`^${escapedName}="([^"]*)"$`, "mu"));
    if (match) environment[variableName] = match[1];
  }
  return environment;
}

export function prepareDemo({
  repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  environment = process.env,
  commandRunner = runCommand,
  log = console.log,
} = {}) {
  const environmentPath = ensureEnvironmentFile(repositoryRoot, log);
  loadDemoEnvironment(environmentPath, environment);

  log("Starting loopback-only PostgreSQL without deleting local data...");
  let existingPostgresContainer;
  try {
    existingPostgresContainer = commandRunner("docker", ["compose", "ps", "-q", "postgres"], {
      cwd: repositoryRoot,
      environment,
      captureOutput: true,
    });
  } catch (error) {
    throw new Error("Could not inspect the PostgreSQL demo container.", { cause: error });
  }

  if (existingPostgresContainer.trim()) {
    commandRunner("docker", ["compose", "start", "postgres"], {
      cwd: repositoryRoot,
      environment,
    });
  } else {
    commandRunner("docker", ["compose", "up", "-d", "postgres"], {
      cwd: repositoryRoot,
      environment,
    });
  }

  const preparedPostgresContainer = commandRunner("docker", ["compose", "ps", "-q", "postgres"], {
    cwd: repositoryRoot,
    environment,
    captureOutput: true,
  }).trim();
  if (!preparedPostgresContainer) throw new Error("PostgreSQL demo container did not start.");

  for (const args of [
    ["install", "--frozen-lockfile"],
    ["prisma:generate"],
    ["db:migrate:deploy"],
    ["db:migrate:status"],
    ["db:seed"],
    ["traceability:check"],
  ]) {
    commandRunner("pnpm", args, { cwd: repositoryRoot, environment });
  }

  return {
    containerId: preparedPostgresContainer,
    createdByP15: !existingPostgresContainer.trim(),
    startedByP15: true,
    environment,
  };
}

const isMain =
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  (async () => {
    const prepared = prepareDemo();
    const { inspectComposeContainer, verifyDemo } = await import("./demo.mjs");
    const { readRuntimeState, updateRuntimeState } = await import("./demo-runtime.mjs");
    const compose = inspectComposeContainer(prepared.environment);
    if (compose.containerId !== prepared.containerId) {
      throw new Error("PostgreSQL demo container identity changed during preparation.");
    }
    const previous = readRuntimeState();
    updateRuntimeState({
      compose: {
        ...compose,
        createdByP15:
          prepared.createdByP15 ||
          (previous?.compose?.containerId === compose.containerId && previous.compose.createdByP15),
        startedByP15: prepared.startedByP15,
      },
    });
    await verifyDemo({ environment: prepared.environment, recordFingerprint: true });
    console.log("Synthetic demo prepared. Run 'pnpm demo:start'.");
  })().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
