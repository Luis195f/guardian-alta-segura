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

const syntheticPatientRelayRouteRoot =
  "src/app/api/demo/discharge-episodes/[episodeId]/patient-relay/";
const exactSyntheticPatientRelayRoutes = new Set([
  `${syntheticPatientRelayRouteRoot}route.ts`,
  `${syntheticPatientRelayRouteRoot}http.ts`,
  `${syntheticPatientRelayRouteRoot}preview/route.ts`,
  `${syntheticPatientRelayRouteRoot}confirm/route.ts`,
  `${syntheticPatientRelayRouteRoot}review/route.ts`,
]);
const syntheticProfessionalRelayRouteRoot =
  "src/app/api/demo/discharge-episodes/[episodeId]/professional-relay/";
const exactSyntheticProfessionalRelayRoutes = new Set([
  `${syntheticProfessionalRelayRouteRoot}route.ts`,
  `${syntheticProfessionalRelayRouteRoot}http.ts`,
  `${syntheticProfessionalRelayRouteRoot}preview/route.ts`,
  `${syntheticProfessionalRelayRouteRoot}confirm/route.ts`,
  `${syntheticProfessionalRelayRouteRoot}review/route.ts`,
]);
const forbiddenSyntheticTransport =
  /api\.heycall-e\.com|\/v1\/calls|call-e-rest-(?:runtime|adapter)|\bfetch\b|(?:from\s*|import\s*\(|require\s*\()\s*["'](?:node:)?(?:http|https|net|tls)["']|node:(?:http|https|net|tls)|\bundici\b|\baxios\b|XMLHttpRequest|WebSocket/iu;

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
    const relative = path.relative(repositoryRoot, file).replaceAll("\\", "/");
    const insideSyntheticPatientRelayRoutes = relative.startsWith(syntheticPatientRelayRouteRoot);
    const insideSyntheticProfessionalRelayRoutes = relative.startsWith(
      syntheticProfessionalRelayRouteRoot,
    );
    const exactSyntheticPatientRelayRoute = exactSyntheticPatientRelayRoutes.has(relative);
    const exactSyntheticProfessionalRelayRoute =
      exactSyntheticProfessionalRelayRoutes.has(relative);
    if (insideSyntheticPatientRelayRoutes && !exactSyntheticPatientRelayRoute) {
      failures.push(`Unexpected file in synthetic Patient Relay route namespace: ${relative}`);
    }
    if (insideSyntheticProfessionalRelayRoutes && !exactSyntheticProfessionalRelayRoute) {
      failures.push(`Unexpected file in synthetic Professional Relay route namespace: ${relative}`);
    }
    if (
      /call-e-rest|outbound-call|continuity-relay/iu.test(source) &&
      relative !== `${syntheticPatientRelayRouteRoot}http.ts` &&
      relative !== `${syntheticProfessionalRelayRouteRoot}http.ts`
    ) {
      failures.push(`Live CALL-E entrypoint found in ${path.relative(repositoryRoot, file)}`);
    }
    if (
      (insideSyntheticPatientRelayRoutes || insideSyntheticProfessionalRelayRoutes) &&
      forbiddenSyntheticTransport.test(source)
    ) {
      failures.push(`Provider runtime escaped into synthetic demo route in ${relative}`);
    }
  }

  const syntheticProfessionalExecutorPath = path.join(
    repositoryRoot,
    "src/infrastructure/relay/synthetic-demo-professional-relay.ts",
  );
  if (existsSync(syntheticProfessionalExecutorPath)) {
    const source = readFileSync(syntheticProfessionalExecutorPath, "utf8");
    if (
      !source.includes("new LocalSyntheticProfessionalRelayProvider()") ||
      forbiddenSyntheticTransport.test(source)
    ) {
      failures.push(
        "Synthetic Professional Relay executor is not the exact local no-network implementation",
      );
    }
  }

  const syntheticExecutorPath = path.join(
    repositoryRoot,
    "src/infrastructure/relay/synthetic-demo-patient-relay.ts",
  );
  if (existsSync(syntheticExecutorPath)) {
    const source = readFileSync(syntheticExecutorPath, "utf8");
    if (
      !source.includes("new LocalSyntheticPatientRelayProvider()") ||
      forbiddenSyntheticTransport.test(source)
    ) {
      failures.push(
        "Synthetic Patient Relay executor is not the exact local no-network implementation",
      );
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
    "src/infrastructure/relay/synthetic-demo-patient-relay.ts",
    "src/infrastructure/relay/synthetic-demo-professional-relay.ts",
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
