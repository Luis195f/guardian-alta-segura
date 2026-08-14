import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const allowedClassifications = new Set([
  "IMPLEMENTED_AND_TESTED",
  "DOCUMENTED_ONLY",
  "PENDING_DECISION",
  "NOT_EVIDENCED",
  "NOT_APPLICABLE",
]);

const requiredColumns = [
  "ID",
  "Claim",
  "Typical location",
  "Current evidence",
  "Classification",
  "REQ",
  "DEC",
  "Control / hazard",
  "Test evidence",
  "Evidence SHA",
  "Action",
];

function markdownCells(line) {
  return line
    .trim()
    .replace(/^\|/u, "")
    .replace(/\|$/u, "")
    .split("|")
    .map((cell) => cell.trim());
}

function tableRows(markdown, failures) {
  const lines = markdown.split(/\r?\n/u);
  const headerIndex = lines.findIndex((line) => /^\|\s*ID\s*\|\s*Claim\s*\|/u.test(line));
  if (headerIndex < 0) {
    failures.push("El claims register no contiene la tabla canónica con columnas ID y Claim.");
    return [];
  }
  const columns = markdownCells(lines[headerIndex]);
  if (columns.join("|") !== requiredColumns.join("|")) {
    failures.push("El claims register no conserva las columnas canónicas y su orden estable.");
    return [];
  }
  const rows = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    if (!lines[index].startsWith("|")) break;
    const cells = markdownCells(lines[index]);
    if (cells.length !== columns.length) {
      failures.push(
        `La fila de claim tiene ${cells.length} celdas; se esperaban ${columns.length}.`,
      );
      continue;
    }
    rows.push(Object.fromEntries(columns.map((column, cellIndex) => [column, cells[cellIndex]])));
  }
  return rows;
}

function idsFrom(text, pattern) {
  return [...text.matchAll(pattern)].map(([value]) => value);
}

function validateMarkdownLinks(filePath, failures) {
  const markdown = readFileSync(filePath, "utf8");
  for (const match of markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)) {
    const target = match[1].split("#", 1)[0];
    if (!target || /^(?:https?:|mailto:)/u.test(target)) continue;
    const resolved = path.resolve(path.dirname(filePath), decodeURIComponent(target));
    if (!existsSync(resolved)) {
      failures.push(
        `Referencia Markdown rota en '${path.relative(process.cwd(), filePath)}': '${target}'.`,
      );
    }
  }
}

export function checkGovernanceEvidence({
  repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  stdout = console.log,
  stderr = console.error,
} = {}) {
  const claimsPath = path.join(repositoryRoot, "docs", "audit", "gas2-claims-register.md");
  const evidenceIndexPath = path.join(repositoryRoot, "docs", "audit", "gas2-evidence-index.md");
  const requirementsPath = path.join(repositoryRoot, "docs", "requirements-traceability.csv");
  const decisionsPath = path.join(repositoryRoot, "docs", "decision-register.md");
  const hazardsPath = path.join(
    repositoryRoot,
    "docs",
    "clinical-safety",
    "dcb0129",
    "hazard-log-initial.md",
  );
  const requiredFiles = [
    claimsPath,
    evidenceIndexPath,
    requirementsPath,
    decisionsPath,
    hazardsPath,
  ];
  const failures = [];
  for (const filePath of requiredFiles) {
    if (!existsSync(filePath)) failures.push(`No existe '${filePath}'.`);
  }
  if (failures.length > 0) {
    failures.forEach((message) => stderr(message));
    return 1;
  }

  const requirements = new Set(idsFrom(readFileSync(requirementsPath, "utf8"), /REQ-\d{2}/gu));
  const decisions = new Set(idsFrom(readFileSync(decisionsPath, "utf8"), /DEC-\d{3}/gu));
  const hazardText = readFileSync(hazardsPath, "utf8");
  const hazards = new Set(idsFrom(hazardText, /HAZ-GAS-\d{3}/gu));
  const controls = new Set(idsFrom(hazardText, /CTRL-\d{3}-[A-Z]/gu));
  const rows = tableRows(readFileSync(claimsPath, "utf8"), failures);
  const seenIds = new Set();

  for (const row of rows) {
    const claimId = row.ID;
    if (!/^CLAIM-GAS2-\d{3}$/u.test(claimId)) {
      failures.push(`ID de claim inválido: '${claimId}'.`);
    } else if (seenIds.has(claimId)) {
      failures.push(`ID de claim duplicado: '${claimId}'.`);
    }
    seenIds.add(claimId);

    const classification = row.Classification.replaceAll("`", "");
    if (!allowedClassifications.has(classification)) {
      failures.push(`Clasificación no autorizada en ${claimId}: '${classification}'.`);
    }

    const reqRefs = idsFrom(row.REQ, /REQ-\d{2}/gu);
    const decRefs = idsFrom(row.DEC, /DEC-\d{3}/gu);
    const hazardRefs = idsFrom(row["Control / hazard"], /HAZ-GAS-\d{3}/gu);
    const controlRefs = idsFrom(row["Control / hazard"], /CTRL-\d{3}-[A-Z]/gu);
    if (reqRefs.length === 0 && row.REQ !== "`NOT_APPLICABLE`") {
      failures.push(`${claimId} no referencia REQ ni declara NOT_APPLICABLE.`);
    }
    if (decRefs.length === 0 && row.DEC !== "`NOT_APPLICABLE`") {
      failures.push(`${claimId} no referencia DEC ni declara NOT_APPLICABLE.`);
    }
    if (hazardRefs.length === 0 || controlRefs.length === 0) {
      failures.push(`${claimId} debe referenciar al menos un control y un hazard canónicos.`);
    }
    for (const reference of reqRefs) {
      if (!requirements.has(reference))
        failures.push(`${claimId} contiene REQ rota: '${reference}'.`);
    }
    for (const reference of decRefs) {
      if (!decisions.has(reference)) failures.push(`${claimId} contiene DEC rota: '${reference}'.`);
    }
    for (const reference of hazardRefs) {
      if (!hazards.has(reference))
        failures.push(`${claimId} contiene hazard roto: '${reference}'.`);
    }
    for (const reference of controlRefs) {
      if (!controls.has(reference))
        failures.push(`${claimId} contiene control roto: '${reference}'.`);
    }

    const testReferences = [...row["Test evidence"].matchAll(/`([^`]+\.(?:ts|tsx|mjs))`/gu)].map(
      ([, value]) => value,
    );
    if (classification === "IMPLEMENTED_AND_TESTED" && testReferences.length === 0) {
      failures.push(`${claimId} está IMPLEMENTED_AND_TESTED sin referencia de prueba ejecutable.`);
    }
    for (const reference of testReferences) {
      if (!existsSync(path.join(repositoryRoot, reference))) {
        failures.push(`${claimId} contiene referencia de prueba rota: '${reference}'.`);
      }
    }
    const sha = row["Evidence SHA"].replaceAll("`", "");
    if (!/^[0-9a-f]{40}$/u.test(sha)) {
      failures.push(`${claimId} no contiene un SHA completo válido: '${sha}'.`);
    }
  }

  validateMarkdownLinks(claimsPath, failures);
  validateMarkdownLinks(evidenceIndexPath, failures);

  if (rows.length === 0) failures.push("El claims register no contiene claims.");
  if (failures.length > 0) {
    stderr(`FAIL: se detectaron ${failures.length} errores de gobernanza de evidencia.`);
    failures.forEach((message) => stderr(message));
    return 1;
  }
  stdout(
    `PASS: ${rows.length} claims usan exclusivamente la taxonomía autorizada y una cadena REQ/DEC/control/hazard/test/SHA verificable.`,
  );
  stdout("PASS: las referencias locales del claims register y del evidence index están resueltas.");
  return 0;
}

const isMain =
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  try {
    process.exitCode = checkGovernanceEvidence();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
