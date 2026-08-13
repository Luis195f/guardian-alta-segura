import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const requiredColumns = [
  "ID",
  "Título",
  "Responsable",
  "Estado",
  "Función",
  "Riesgo",
  "Control",
  "Criterio de aceptación",
  "Módulo futuro",
  "Prueba de aceptación",
  "Autoridad de validación",
  "Fuente o fundamento",
  "Rol autorizado",
];

const canonicalColumns = [
  "Título",
  "Responsable",
  "Estado",
  "Función",
  "Riesgo",
  "Control",
  "Criterio de aceptación",
  "Fuente o fundamento",
  "Rol autorizado",
];

const canonicalRequirements = [
  {
    ID: "REQ-01",
    Título: "Alta Estructurada",
    Responsable: "Dirección Médica",
    Estado: "Pendiente de protocolo local",
    Función: "validar episodio de alta.",
    Riesgo: "error de identidad.",
    Control: "verificación de identidad conforme al protocolo local.",
    "Criterio de aceptación": "creación exitosa vinculada a un ID seudonimizado.",
    "Fuente o fundamento":
      "El seguimiento precoz postalta se asocia con mejores resultados de continuidad y menor riesgo observado.",
    "Rol autorizado": "Psiquiatría / Enfermería",
  },
  {
    ID: "REQ-02",
    Título: "Consentimiento y Bases Legales",
    Responsable: "Responsable del Tratamiento",
    Estado: "Pendiente de evaluación jurídica",
    Función:
      "diferenciar participación en piloto, participación digital, comunicaciones telemáticas y base jurídica del tratamiento asistencial.",
    Riesgo: "tratamiento sin base jurídica adecuada.",
    Control: "registro granular e independiente.",
    "Criterio de aceptación":
      "ninguna comunicación sin permiso específico vigente y base jurídica configurada para el mismo canal y finalidad.",
    "Fuente o fundamento": "RGPD y Autonomía del Paciente.",
    "Rol autorizado": "Paciente / Clínico",
  },
  {
    ID: "REQ-03",
    Título: "Plan de Seguridad",
    Responsable: "Dirección de Enfermería",
    Estado: "Definido para desarrollo",
    Función: "Plan Stanley-Brown versionado.",
    Riesgo: "pérdida de trazabilidad clínica.",
    Control: "versiones históricas o sustituidas sin sobrescritura.",
    "Criterio de aceptación": "editar genera v.N+1 y conserva v.N.",
    "Fuente o fundamento": "Intervención Stanley-Brown (6 pasos).",
    "Rol autorizado": "Paciente / Enfermería",
  },
  {
    ID: "REQ-04",
    Título: "Check-ins",
    Responsable: "Dirección Médica",
    Estado: "Pendiente de protocolo local",
    Función: "cuestionarios con frecuencia configurable.",
    Riesgo: "fatiga tecnológica.",
    Control: "parámetros configurables localmente, no codificados como constantes clínicas.",
    "Criterio de aceptación": "cadencia aplicada conforme a configuración vigente.",
    "Fuente o fundamento": "Monitorización remota de PROMs.",
    "Rol autorizado": "Paciente",
  },
  {
    ID: "REQ-05",
    Título: "Familia / Cuidador",
    Responsable: "Responsable del Tratamiento",
    Estado: "Definido para desarrollo",
    Función: "gestionar autorización del cuidador.",
    Riesgo: "acceso indebido.",
    Control: "autorización explícita, granular y revocable.",
    "Criterio de aceptación": "cuidador solo visualiza módulos autorizados.",
    "Fuente o fundamento": "Soporte familiar en la recuperación.",
    "Rol autorizado": "Paciente",
  },
  {
    ID: "REQ-06",
    Título: "Revocación",
    Responsable: "Responsable del Tratamiento",
    Estado: "Pendiente de evaluación jurídica",
    Función: "retirar acceso o participación sin borrar historia clínica previa.",
    Riesgo: "borrado ilícito de documentación clínica.",
    Control: "desactivar accesos y envíos sin hard-delete.",
    "Criterio de aceptación":
      "revocar una autorización invalida inmediatamente ese acceso para el sujeto, cuidador y scope afectados en cada nueva petición, sin cerrar otros accesos legítimos.",
    "Fuente o fundamento": "RGPD (Art. 7.3).",
    "Rol autorizado": "Paciente / Clínico",
  },
  {
    ID: "REQ-07",
    Título: "Domicilio Seguro",
    Responsable: "Dirección de Enfermería",
    Estado: "Pendiente de validación clínica",
    Función: "registrar información, elementos pendientes y revisión humana.",
    Riesgo: "falsa sensación de seguridad.",
    Control: "disclaimer explícito y carácter informativo.",
    "Criterio de aceptación":
      "checkbox de comprensión; nunca certificar que el domicilio es seguro.",
    "Fuente o fundamento": "Mitigación de riesgos ambientales.",
    "Rol autorizado": "Cuidador / Enfermería",
  },
  {
    ID: "REQ-08",
    Título: "Avisos Explicables",
    Responsable: "Dirección Médica",
    Estado: "Pendiente de validación clínica",
    Función: "reglas configurables, versionadas, explicables y aprobadas localmente.",
    Riesgo: "sesgo de automatización.",
    Control: "explicación y origen visibles; semáforo bajo feature flag.",
    "Criterio de aceptación": "mostrar dato desencadenante sin puntuación predictiva.",
    "Fuente o fundamento": "Organización de la información.",
    "Rol autorizado": "Enfermería",
  },
  {
    ID: "REQ-09",
    Título: "Gestión de Tareas",
    Responsable: "Dirección de Enfermería",
    Estado: "Definido para desarrollo",
    Función: "derivar acciones después de revisión humana.",
    Riesgo: "omisión asistencial.",
    Control: "tarea vinculada al aviso de origen.",
    "Criterio de aceptación":
      "interfaz permite crear tarea vinculada al marcar el aviso como revisado.",
    "Fuente o fundamento": "Trazabilidad de la acción clínica.",
    "Rol autorizado": "Enfermería / Psiquiatría",
  },
  {
    ID: "REQ-10",
    Título: "Botón de Crisis",
    Responsable: "Dirección Médica, autoridad final única",
    Estado: "Pendiente de protocolo local",
    Función: "abrir recurso oficial validado localmente.",
    Riesgo: "enrutamiento erróneo.",
    Control: "número aprobado clínicamente y verificado por TI.",
    "Criterio de aceptación": "abrir marcador nativo con el número exacto.",
    "Fuente o fundamento": "Conexión con emergencias.",
    "Rol autorizado": "Paciente",
  },
  {
    ID: "REQ-11",
    Título: "SBAR y Exportación",
    Responsable: "Dirección Médica",
    Estado: "Definido para desarrollo",
    Función: "redactar evolución SBAR y exportar PDF minimizado.",
    Riesgo: "brecha de privacidad.",
    Control: "minimización de identificadores.",
    "Criterio de aceptación":
      "PDF contiene exclusivamente los datos definidos por protocolo local.",
    "Fuente o fundamento": "Transferencia estandarizada y segura.",
    "Rol autorizado": "Enfermería / Psiquiatría",
  },
  {
    ID: "REQ-12",
    Título: "Autenticación y RBAC",
    Responsable: "Dirección TI",
    Estado: "Pendiente de verificación técnica",
    Función: "autenticación reforzada para profesionales y proporcional para pacientes/cuidadores.",
    Riesgo: "accesos ilícitos.",
    Control: "proveedor institucional y roles estrictos.",
    "Criterio de aceptación": "soporte no puede leer notas clínicas en texto plano.",
    "Fuente o fundamento": "Seguridad de acceso (MDR, RGPD).",
    "Rol autorizado": "Todos",
  },
  {
    ID: "REQ-13",
    Título: "Gestión de Incidentes",
    Responsable: "Dirección TI",
    Estado: "Definido para desarrollo",
    Función: "reportar fallos sin exponer datos clínicos.",
    Riesgo: "fallo oculto o exposición de información sanitaria.",
    Control: "tickets técnicos segregados de la base de salud.",
    "Criterio de aceptación": "el incidente técnico no incluye diagnóstico ni nota clínica.",
    "Fuente o fundamento": "Trazabilidad técnica.",
    "Rol autorizado": "Soporte Técnico",
  },
  {
    ID: "REQ-14",
    Título: "Caída del Sistema",
    Responsable: "Dirección de Enfermería",
    Estado: "Pendiente de protocolo local",
    Función: "censo de contingencia opcional.",
    Riesgo: "pérdida de seguimiento.",
    Control: "acceso sujeto al plan local de continuidad.",
    "Criterio de aceptación": "acceso manual o restablecimiento validado.",
    "Fuente o fundamento": "Continuidad de negocio.",
    "Rol autorizado": "Enfermería Gestora",
  },
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ";") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function toObjects(rows) {
  if (rows.length === 0) return { columns: [], records: [] };
  const [columns, ...dataRows] = rows;
  return {
    columns,
    records: dataRows.map((values) =>
      Object.fromEntries(columns.map((column, index) => [column, values[index] ?? ""])),
    ),
  };
}

function markdownCells(line) {
  return line
    .trim()
    .replace(/^\|/u, "")
    .replace(/\|$/u, "")
    .split("|")
    .map((cell) => cell.trim());
}

function testExactColumns(source, actual, failures) {
  const missing = requiredColumns.filter((column) => !actual.includes(column));
  if (missing.length > 0) {
    failures.push(`${source} no contiene columnas obligatorias: ${missing.join(", ")}.`);
  }
  if (actual.join("|") !== requiredColumns.join("|")) {
    failures.push(`${source} no conserva el nombre y orden estable de las columnas.`);
  }
}

function testRequirementSet(source, rows, failures) {
  const expectedIds = canonicalRequirements.map(({ ID }) => ID);
  const actualIds = rows.map(({ ID }) => String(ID ?? ""));

  for (const id of new Set(actualIds)) {
    if (actualIds.filter((actualId) => actualId === id).length > 1) {
      failures.push(`${source} contiene el ID duplicado '${id}'.`);
    }
  }
  for (const id of expectedIds.filter((expectedId) => !actualIds.includes(expectedId))) {
    failures.push(`${source} no contiene el requisito esperado '${id}'.`);
  }
  for (const id of new Set(actualIds.filter((actualId) => !expectedIds.includes(actualId)))) {
    failures.push(`${source} contiene el ID inesperado '${id}'.`);
  }

  for (const expected of canonicalRequirements) {
    const matches = rows.filter(({ ID }) => ID === expected.ID);
    if (matches.length !== 1) continue;
    for (const column of canonicalColumns) {
      const actualValue = String(matches[0][column] ?? "");
      const expectedValue = String(expected[column]);
      if (actualValue !== expectedValue) {
        failures.push(
          `${source} altera '${column}' de ${expected.ID}. Esperado: '${expectedValue}'. Actual: '${actualValue}'.`,
        );
      }
    }
  }
}

export function checkRequirementsTraceability({
  repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  stdout = console.log,
  stderr = console.error,
} = {}) {
  const csvPath = path.join(repositoryRoot, "docs", "requirements-traceability.csv");
  const markdownPath = path.join(repositoryRoot, "docs", "requirements-traceability.md");
  const failures = [];

  if (!existsSync(csvPath)) failures.push(`No existe '${csvPath}'.`);
  if (!existsSync(markdownPath)) failures.push(`No existe '${markdownPath}'.`);
  if (failures.length > 0) {
    failures.forEach((message) => stderr(message));
    return 1;
  }

  const csvBytes = readFileSync(csvPath);
  if (csvBytes.length < 3 || csvBytes[0] !== 0xef || csvBytes[1] !== 0xbb || csvBytes[2] !== 0xbf) {
    failures.push("El CSV debe estar codificado como UTF-8 con BOM.");
  }

  const csvText = csvBytes.toString("utf8").replace(/^\uFEFF/u, "");
  const { columns: csvColumns, records: csvRows } = toObjects(parseCsv(csvText));
  if (csvRows.length === 0) failures.push("El CSV no contiene filas de requisitos.");
  testExactColumns("CSV", csvRows.length === 0 ? [] : csvColumns, failures);
  testRequirementSet("CSV", csvRows, failures);

  const markdownLines = readFileSync(markdownPath, "utf8").split(/\r?\n/u);
  const headerIndex = markdownLines.findIndex((line) => /^\|\s*ID\s*\|/u.test(line));
  let markdownColumns = [];
  const markdownRows = [];
  if (headerIndex < 0) {
    failures.push("Markdown no contiene la tabla de requisitos con columna ID.");
  } else {
    markdownColumns = markdownCells(markdownLines[headerIndex]);
    testExactColumns("Markdown", markdownColumns, failures);
    for (let index = headerIndex + 2; index < markdownLines.length; index += 1) {
      const line = markdownLines[index];
      if (!line.startsWith("|")) break;
      const cells = markdownCells(line);
      if (cells.length !== markdownColumns.length) {
        failures.push(
          `Markdown contiene una fila con ${cells.length} celdas; se esperaban ${markdownColumns.length}: '${line}'.`,
        );
        continue;
      }
      markdownRows.push(
        Object.fromEntries(markdownColumns.map((column, cellIndex) => [column, cells[cellIndex]])),
      );
    }
  }
  testRequirementSet("Markdown", markdownRows, failures);

  for (const { ID } of canonicalRequirements) {
    const csvMatches = csvRows.filter((row) => row.ID === ID);
    const markdownMatches = markdownRows.filter((row) => row.ID === ID);
    if (csvMatches.length !== 1 || markdownMatches.length !== 1) continue;
    for (const column of requiredColumns) {
      const csvValue = String(csvMatches[0][column] ?? "");
      const markdownValue = String(markdownMatches[0][column] ?? "");
      if (csvValue !== markdownValue) {
        failures.push(
          `Diferencia semántica para ${ID} en '${column}'. CSV: '${csvValue}'. Markdown: '${markdownValue}'.`,
        );
      }
    }
  }

  if (failures.length > 0) {
    stderr(`FAIL: se detectaron ${failures.length} errores de trazabilidad.`);
    failures.forEach((message) => stderr(message));
    return 1;
  }

  stdout("PASS: REQ-01 a REQ-14 son únicos, canónicos y equivalentes en CSV y Markdown.");
  stdout(
    "PASS: Fuente o fundamento y Rol autorizado conservan su valor canónico exacto por requisito.",
  );
  stdout("PASS: el CSV usa columnas estables, separador punto y coma y UTF-8 BOM.");
  return 0;
}

const isMain =
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  try {
    process.exitCode = checkRequirementsTraceability();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
