import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import manifest from "../config/synthetic-demo-manifest.json" with { type: "json" };

export const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const runtimeStatePath = path.join(repositoryRoot, ".demo-runtime.json");

export class DemoCommandError extends Error {
  constructor(code, exitCode = 1) {
    super(code);
    this.name = "DemoCommandError";
    this.code = code;
    this.exitCode = exitCode;
  }
}

export function parseEnvironmentText(text) {
  const values = {};
  for (const line of text.split(/\r?\n/u)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(?:"([^"]*)"|'([^']*)'|([^#\s]*))\s*(?:#.*)?$/u);
    if (match) values[match[1]] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return values;
}

export function loadDemoEnvironment(root = repositoryRoot, base = process.env) {
  const environmentPath = path.join(root, ".env");
  if (!existsSync(environmentPath)) throw new DemoCommandError("DEMO_ENV_FILE_MISSING", 2);
  const values = parseEnvironmentText(readFileSync(environmentPath, "utf8"));
  return { ...base, ...values };
}

export function validateDemoEnvironment(environment, { allowAlternateDatabasePort = false } = {}) {
  for (const [name, expected] of Object.entries(manifest.requiredFlags)) {
    if (environment[name] !== expected) throw new DemoCommandError(`DEMO_FLAG_INVALID:${name}`, 2);
  }
  if (environment.APP_BASE_URL !== manifest.appBaseUrl) {
    throw new DemoCommandError("APP_BASE_URL_NOT_CANONICAL_LOOPBACK", 2);
  }

  let databaseUrl;
  try {
    databaseUrl = new URL(environment.DATABASE_URL);
  } catch {
    throw new DemoCommandError("DATABASE_URL_INVALID", 2);
  }
  if (
    !["postgresql:", "postgres:"].includes(databaseUrl.protocol) ||
    databaseUrl.hostname !== manifest.database.hostname ||
    databaseUrl.username !== manifest.database.user ||
    databaseUrl.pathname !== `/${manifest.database.name}` ||
    (!allowAlternateDatabasePort && Number(databaseUrl.port || "5432") !== manifest.database.port)
  ) {
    throw new DemoCommandError("DATABASE_TARGET_NOT_CANONICAL_DEMO", 2);
  }
  return databaseUrl;
}

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

export function runSync(
  executable,
  args,
  { cwd = repositoryRoot, environment = process.env, capture = false } = {},
) {
  const invocation =
    executable === "pnpm" ? resolvePnpmInvocation(args, environment) : { executable, args };
  const result = spawnSync(invocation.executable, invocation.args, {
    cwd,
    env: environment,
    shell: false,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.error || result.status !== 0) {
    throw new DemoCommandError(
      `SUBPROCESS_FAILED:${executable}:${args[0] ?? "unknown"}`,
      result.status ?? 1,
    );
  }
  return capture ? (result.stdout ?? "") : "";
}

export function spawnProcess(
  executable,
  args,
  { cwd = repositoryRoot, environment = process.env } = {},
) {
  return spawn(executable, args, { cwd, env: environment, shell: false, stdio: "inherit" });
}

export function readRuntimeState() {
  if (!existsSync(runtimeStatePath)) return null;
  try {
    const state = JSON.parse(readFileSync(runtimeStatePath, "utf8"));
    return state?.schemaVersion === 1 && state.repositoryRoot === repositoryRoot ? state : null;
  } catch {
    return null;
  }
}

export function writeRuntimeState(state) {
  const temporaryPath = `${runtimeStatePath}.${process.pid}.tmp`;
  writeFileSync(
    temporaryPath,
    `${JSON.stringify({ schemaVersion: 1, repositoryRoot, ...state }, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  renameSync(temporaryPath, runtimeStatePath);
}

export function updateRuntimeState(patch) {
  writeRuntimeState({ ...(readRuntimeState() ?? {}), ...patch });
}

export function safeErrorLine(error) {
  if (error instanceof DemoCommandError) return `DEMO_ERROR=${error.code}`;
  if (
    error &&
    typeof error === "object" &&
    typeof error.code === "string" &&
    /^[A-Z0-9_:.-]+$/u.test(error.code)
  ) {
    return `DEMO_ERROR=${error.code}`;
  }
  return "DEMO_ERROR=UNCLASSIFIED";
}

export async function waitForHealth(baseUrl, { attempts = 60, delayMilliseconds = 500 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(new URL("/api/health", baseUrl), {
        headers: { Host: new URL(baseUrl).host },
        signal: AbortSignal.timeout(2_000),
      });
      const payload = await response.json();
      if (
        response.status === 200 &&
        payload?.status === "ok" &&
        payload?.service === "guardian-alta-segura" &&
        Object.keys(payload).sort().join(",") === "service,status"
      ) {
        return;
      }
    } catch {
      // Readiness is retried within the bounded deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, delayMilliseconds));
  }
  throw new DemoCommandError("APPLICATION_READINESS_TIMEOUT", 4);
}

export { manifest };
