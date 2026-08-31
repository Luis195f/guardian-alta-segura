import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const forbiddenProductionTokens = [
  "@call-e/calle",
  "createAndWait",
  "webhookUrl",
  "webhook_url",
  "/v1/goals",
  "/v1/calls/batch",
];

function filesBelow(root) {
  if (!existsSync(root)) return [];
  const files = [];
  for (const entry of readdirSync(root)) {
    const absolute = path.join(root, entry);
    if (statSync(absolute).isDirectory()) files.push(...filesBelow(absolute));
    else if (/\.(?:ts|tsx|js|mjs)$/u.test(entry) && !/\.(?:test|spec)\./u.test(entry))
      files.push(absolute);
  }
  return files;
}

export function checkCallERestBoundary({
  repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  stdout = console.log,
  stderr = console.error,
} = {}) {
  const failures = [];
  const packagePath = path.join(repositoryRoot, "package.json");
  const lockPath = path.join(repositoryRoot, "pnpm-lock.yaml");
  const productFiles = filesBelow(path.join(repositoryRoot, "src"));

  for (const manifestPath of [packagePath, lockPath]) {
    if (!existsSync(manifestPath)) {
      failures.push(`Missing dependency manifest: ${path.relative(repositoryRoot, manifestPath)}`);
      continue;
    }
    if (readFileSync(manifestPath, "utf8").includes("@call-e/calle")) {
      failures.push(
        `Prohibited CALL-E SDK dependency in ${path.relative(repositoryRoot, manifestPath)}`,
      );
    }
  }

  for (const file of productFiles) {
    const source = readFileSync(file, "utf8");
    for (const token of forbiddenProductionTokens) {
      if (source.includes(token)) {
        failures.push(
          `Prohibited production token '${token}' in ${path.relative(repositoryRoot, file)}`,
        );
      }
    }
    if (source.includes("NEXT_PUBLIC_") && /CALL[_-]?E/iu.test(source)) {
      failures.push(
        `Browser-visible CALL-E configuration in ${path.relative(repositoryRoot, file)}`,
      );
    }
    const relative = path.relative(repositoryRoot, file).replaceAll("\\", "/");
    if (
      (source.includes("api.heycall-e.com") || source.includes("/v1/calls")) &&
      !relative.startsWith("src/infrastructure/call-transport/")
    ) {
      failures.push(`Provider REST contract escaped infrastructure in ${relative}`);
    }
  }

  for (const file of filesBelow(path.join(repositoryRoot, "src", "app"))) {
    const source = readFileSync(file, "utf8");
    if (/call-e-rest|outbound-call|continuity-relay/iu.test(source)) {
      failures.push(`Live CALL-E entrypoint found in ${path.relative(repositoryRoot, file)}`);
    }
  }

  const requiredServerFiles = [
    "src/infrastructure/call-transport/call-e-rest-config.ts",
    "src/infrastructure/call-transport/call-e-rest-adapter.ts",
    "src/infrastructure/call-transport/call-e-rest-runtime.ts",
    "src/infrastructure/call-transport/keyed-call-fingerprint.ts",
    "src/infrastructure/persistence/prisma-outbound-call-intent-store.ts",
    "src/infrastructure/persistence/prisma-continuity-relay-store.ts",
    "src/infrastructure/relay/hmac-relay-secret-protector.ts",
    "src/infrastructure/relay/unavailable-relay-authority.ts",
  ];
  for (const relative of requiredServerFiles) {
    const file = path.join(repositoryRoot, relative);
    if (!existsSync(file) || !readFileSync(file, "utf8").includes("assertServerOnlyRuntime();")) {
      failures.push(`Missing server-only guard in ${relative}`);
    }
  }

  if (failures.length > 0) {
    stderr(`FAIL: ${failures.length} CALL-E REST boundary violation(s).`);
    failures.forEach((failure) => stderr(failure));
    return 1;
  }
  stdout("PASS: CALL-E SDK absent; REST provider details remain server-only infrastructure.");
  stdout("PASS: no live entrypoint and no prohibited webhook, Goals, batch, or helper surface.");
  return 0;
}

const isMain =
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) process.exitCode = checkCallERestBoundary();
