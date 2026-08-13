import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

import { verifyDemo } from "./demo.mjs";
import {
  DemoCommandError,
  loadDemoEnvironment,
  manifest,
  runSync,
  safeErrorLine,
  validateDemoEnvironment,
} from "./demo-runtime.mjs";

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function assertPortReleased(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", () => reject(new DemoCommandError("SMOKE_PORT_NOT_RELEASED", 7)));
    server.listen({ host: "127.0.0.1", port }, () => server.close(resolve));
  });
}

function assertEphemeralProject(project, composePath, temporaryRoot) {
  if (!/^gas-p15-smoke-[a-f0-9]{12}$/u.test(project)) {
    throw new DemoCommandError("SMOKE_PROJECT_NAME_INVALID", 7);
  }
  const relative = path.relative(temporaryRoot, composePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new DemoCommandError("SMOKE_COMPOSE_PATH_INVALID", 7);
  }
}

export async function smokeDemo() {
  const baseEnvironment = loadDemoEnvironment();
  validateDemoEnvironment(baseEnvironment);
  const databasePort = await freePort();
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), "gas-p15-smoke-"));
  const project = `gas-p15-smoke-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const composePath = path.join(temporaryRoot, "compose.yml");
  const password = "p15-synthetic-smoke-only";
  const databaseUrl = `postgresql://${manifest.database.user}:${password}@127.0.0.1:${databasePort}/${manifest.database.name}?schema=public`;
  const environment = {
    ...baseEnvironment,
    DATABASE_URL: databaseUrl,
    P15_DATABASE_URL_OVERRIDE: databaseUrl,
    POSTGRES_PASSWORD: password,
  };
  writeFileSync(
    composePath,
    `services:\n  postgres:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_DB: guardian_demo\n      POSTGRES_USER: guardian_demo\n      POSTGRES_PASSWORD: p15-synthetic-smoke-only\n    ports:\n      - \"127.0.0.1:${databasePort}:5432\"\n    healthcheck:\n      test: [\"CMD-SHELL\", \"pg_isready -U guardian_demo -d guardian_demo\"]\n      interval: 1s\n      timeout: 3s\n      retries: 30\n    volumes:\n      - postgres-data:/var/lib/postgresql/data\nvolumes:\n  postgres-data:\n`,
    "utf8",
  );
  assertEphemeralProject(project, composePath, temporaryRoot);
  let started = false;
  try {
    runSync("docker", ["compose", "-p", project, "-f", composePath, "up", "-d"], { environment });
    started = true;
    const containerId = runSync(
      "docker",
      ["compose", "-p", project, "-f", composePath, "ps", "-q", "postgres"],
      { environment, capture: true },
    ).trim();
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const health = runSync(
        "docker",
        ["inspect", "--format", "{{.State.Health.Status}}", containerId],
        {
          environment,
          capture: true,
        },
      ).trim();
      if (health === "healthy") break;
      if (attempt === 59) throw new DemoCommandError("SMOKE_POSTGRES_READINESS_TIMEOUT", 7);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    runSync("pnpm", ["prisma:generate"], { environment });
    runSync("pnpm", ["db:migrate:deploy"], { environment });
    runSync("pnpm", ["db:migrate:status"], { environment });
    runSync("pnpm", ["db:seed"], { environment });
    const first = await verifyDemo({
      environment,
      allowAlternateDatabasePort: true,
      requireComposeOwnership: false,
    });
    runSync("pnpm", ["db:seed"], { environment });
    const second = await verifyDemo({
      environment,
      allowAlternateDatabasePort: true,
      requireComposeOwnership: false,
    });
    if (first.fingerprint !== second.fingerprint) {
      throw new DemoCommandError("SMOKE_FINGERPRINT_NOT_REPRODUCIBLE", 7);
    }
    runSync("pnpm", ["exec", "playwright", "test", "--config=playwright.demo-smoke.config.ts"], {
      environment,
    });
    console.log(`SMOKE_FINGERPRINT=${first.fingerprint}`);
    console.log("SMOKE_ROLE_SCENARIOS=6/6");
    console.log("SMOKE_EXTERNAL_REQUESTS=0");
    console.log("DEMO_SMOKE=PASS");
  } finally {
    if (started) {
      assertEphemeralProject(project, composePath, temporaryRoot);
      runSync(
        "docker",
        ["compose", "-p", project, "-f", composePath, "down", "--volumes", "--remove-orphans"],
        { environment },
      );
      for (const [resource, args] of [
        [
          "container",
          ["ps", "-a", "-q", "--filter", `label=com.docker.compose.project=${project}`],
        ],
        [
          "network",
          ["network", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`],
        ],
        [
          "volume",
          ["volume", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`],
        ],
      ]) {
        if (runSync("docker", args, { environment, capture: true }).trim()) {
          throw new DemoCommandError(`SMOKE_${resource.toUpperCase()}_ORPHANED`, 7);
        }
      }
    }
    rmSync(temporaryRoot, { recursive: true, force: true });
    await assertPortReleased(databasePort);
  }
}

smokeDemo().catch((error) => {
  console.error(safeErrorLine(error));
  process.exitCode = error instanceof DemoCommandError ? error.exitCode : 1;
});
