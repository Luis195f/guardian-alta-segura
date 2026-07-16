[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$csvPath = Join-Path $repoRoot 'docs/requirements-traceability.csv'
$markdownPath = Join-Path $repoRoot 'docs/requirements-traceability.md'

$requiredColumns = @(
    'ID',
    'Título',
    'Responsable',
    'Estado',
    'Función',
    'Riesgo',
    'Control',
    'Criterio de aceptación',
    'Módulo futuro',
    'Prueba de aceptación',
    'Autoridad de validación',
    'Fuente o fundamento',
    'Rol autorizado'
)

$canonicalRequirements = @(
    [pscustomobject]@{ ID = 'REQ-01'; Título = 'Alta Estructurada'; Responsable = 'Dirección Médica'; Estado = 'Pendiente de protocolo local'; Función = 'validar episodio de alta.'; Riesgo = 'error de identidad.'; Control = 'verificación de identidad conforme al protocolo local.'; 'Criterio de aceptación' = 'creación exitosa vinculada a un ID seudonimizado.'; 'Fuente o fundamento' = 'El seguimiento precoz postalta se asocia con mejores resultados de continuidad y menor riesgo observado.'; 'Rol autorizado' = 'Psiquiatría / Enfermería' },
    [pscustomobject]@{ ID = 'REQ-02'; Título = 'Consentimiento y Bases Legales'; Responsable = 'Responsable del Tratamiento'; Estado = 'Pendiente de evaluación jurídica'; Función = 'diferenciar participación en piloto, participación digital, comunicaciones telemáticas y base jurídica del tratamiento asistencial.'; Riesgo = 'tratamiento sin base jurídica adecuada.'; Control = 'registro granular e independiente.'; 'Criterio de aceptación' = 'ninguna comunicación sin permiso específico vigente y base jurídica configurada para el mismo canal y finalidad.'; 'Fuente o fundamento' = 'RGPD y Autonomía del Paciente.'; 'Rol autorizado' = 'Paciente / Clínico' },
    [pscustomobject]@{ ID = 'REQ-03'; Título = 'Plan de Seguridad'; Responsable = 'Dirección de Enfermería'; Estado = 'Definido para desarrollo'; Función = 'Plan Stanley-Brown versionado.'; Riesgo = 'pérdida de trazabilidad clínica.'; Control = 'versiones históricas o sustituidas sin sobrescritura.'; 'Criterio de aceptación' = 'editar genera v.N+1 y conserva v.N.'; 'Fuente o fundamento' = 'Intervención Stanley-Brown (6 pasos).'; 'Rol autorizado' = 'Paciente / Enfermería' },
    [pscustomobject]@{ ID = 'REQ-04'; Título = 'Check-ins'; Responsable = 'Dirección Médica'; Estado = 'Pendiente de protocolo local'; Función = 'cuestionarios con frecuencia configurable.'; Riesgo = 'fatiga tecnológica.'; Control = 'parámetros configurables localmente, no codificados como constantes clínicas.'; 'Criterio de aceptación' = 'cadencia aplicada conforme a configuración vigente.'; 'Fuente o fundamento' = 'Monitorización remota de PROMs.'; 'Rol autorizado' = 'Paciente' },
    [pscustomobject]@{ ID = 'REQ-05'; Título = 'Familia / Cuidador'; Responsable = 'Responsable del Tratamiento'; Estado = 'Definido para desarrollo'; Función = 'gestionar autorización del cuidador.'; Riesgo = 'acceso indebido.'; Control = 'autorización explícita, granular y revocable.'; 'Criterio de aceptación' = 'cuidador solo visualiza módulos autorizados.'; 'Fuente o fundamento' = 'Soporte familiar en la recuperación.'; 'Rol autorizado' = 'Paciente' },
    [pscustomobject]@{ ID = 'REQ-06'; Título = 'Revocación'; Responsable = 'Responsable del Tratamiento'; Estado = 'Pendiente de evaluación jurídica'; Función = 'retirar acceso o participación sin borrar historia clínica previa.'; Riesgo = 'borrado ilícito de documentación clínica.'; Control = 'desactivar accesos y envíos sin hard-delete.'; 'Criterio de aceptación' = 'revocar una autorización invalida inmediatamente ese acceso para el sujeto, cuidador y scope afectados en cada nueva petición, sin cerrar otros accesos legítimos.'; 'Fuente o fundamento' = 'RGPD (Art. 7.3).'; 'Rol autorizado' = 'Paciente / Clínico' },
    [pscustomobject]@{ ID = 'REQ-07'; Título = 'Domicilio Seguro'; Responsable = 'Dirección de Enfermería'; Estado = 'Pendiente de validación clínica'; Función = 'registrar información, elementos pendientes y revisión humana.'; Riesgo = 'falsa sensación de seguridad.'; Control = 'disclaimer explícito y carácter informativo.'; 'Criterio de aceptación' = 'checkbox de comprensión; nunca certificar que el domicilio es seguro.'; 'Fuente o fundamento' = 'Mitigación de riesgos ambientales.'; 'Rol autorizado' = 'Cuidador / Enfermería' },
    [pscustomobject]@{ ID = 'REQ-08'; Título = 'Avisos Explicables'; Responsable = 'Dirección Médica'; Estado = 'Pendiente de validación clínica'; Función = 'reglas configurables, versionadas, explicables y aprobadas localmente.'; Riesgo = 'sesgo de automatización.'; Control = 'explicación y origen visibles; semáforo bajo feature flag.'; 'Criterio de aceptación' = 'mostrar dato desencadenante sin puntuación predictiva.'; 'Fuente o fundamento' = 'Organización de la información.'; 'Rol autorizado' = 'Enfermería' },
    [pscustomobject]@{ ID = 'REQ-09'; Título = 'Gestión de Tareas'; Responsable = 'Dirección de Enfermería'; Estado = 'Definido para desarrollo'; Función = 'derivar acciones después de revisión humana.'; Riesgo = 'omisión asistencial.'; Control = 'tarea vinculada al aviso de origen.'; 'Criterio de aceptación' = 'interfaz permite crear tarea vinculada al marcar el aviso como revisado.'; 'Fuente o fundamento' = 'Trazabilidad de la acción clínica.'; 'Rol autorizado' = 'Enfermería / Psiquiatría' },
    [pscustomobject]@{ ID = 'REQ-10'; Título = 'Botón de Crisis'; Responsable = 'Dirección Médica, autoridad final única'; Estado = 'Pendiente de protocolo local'; Función = 'abrir recurso oficial validado localmente.'; Riesgo = 'enrutamiento erróneo.'; Control = 'número aprobado clínicamente y verificado por TI.'; 'Criterio de aceptación' = 'abrir marcador nativo con el número exacto.'; 'Fuente o fundamento' = 'Conexión con emergencias.'; 'Rol autorizado' = 'Paciente' },
    [pscustomobject]@{ ID = 'REQ-11'; Título = 'SBAR y Exportación'; Responsable = 'Dirección Médica'; Estado = 'Definido para desarrollo'; Función = 'redactar evolución SBAR y exportar PDF minimizado.'; Riesgo = 'brecha de privacidad.'; Control = 'minimización de identificadores.'; 'Criterio de aceptación' = 'PDF contiene exclusivamente los datos definidos por protocolo local.'; 'Fuente o fundamento' = 'Transferencia estandarizada y segura.'; 'Rol autorizado' = 'Enfermería / Psiquiatría' },
    [pscustomobject]@{ ID = 'REQ-12'; Título = 'Autenticación y RBAC'; Responsable = 'Dirección TI'; Estado = 'Pendiente de verificación técnica'; Función = 'autenticación reforzada para profesionales y proporcional para pacientes/cuidadores.'; Riesgo = 'accesos ilícitos.'; Control = 'proveedor institucional y roles estrictos.'; 'Criterio de aceptación' = 'soporte no puede leer notas clínicas en texto plano.'; 'Fuente o fundamento' = 'Seguridad de acceso (MDR, RGPD).'; 'Rol autorizado' = 'Todos' },
    [pscustomobject]@{ ID = 'REQ-13'; Título = 'Gestión de Incidentes'; Responsable = 'Dirección TI'; Estado = 'Definido para desarrollo'; Función = 'reportar fallos sin exponer datos clínicos.'; Riesgo = 'fallo oculto o exposición de información sanitaria.'; Control = 'tickets técnicos segregados de la base de salud.'; 'Criterio de aceptación' = 'el incidente técnico no incluye diagnóstico ni nota clínica.'; 'Fuente o fundamento' = 'Trazabilidad técnica.'; 'Rol autorizado' = 'Soporte Técnico' },
    [pscustomobject]@{ ID = 'REQ-14'; Título = 'Caída del Sistema'; Responsable = 'Dirección de Enfermería'; Estado = 'Pendiente de protocolo local'; Función = 'censo de contingencia opcional.'; Riesgo = 'pérdida de seguimiento.'; Control = 'acceso sujeto al plan local de continuidad.'; 'Criterio de aceptación' = 'acceso manual o restablecimiento validado.'; 'Fuente o fundamento' = 'Continuidad de negocio.'; 'Rol autorizado' = 'Enfermería Gestora' }
)

$canonicalColumns = @('Título', 'Responsable', 'Estado', 'Función', 'Riesgo', 'Control', 'Criterio de aceptación', 'Fuente o fundamento', 'Rol autorizado')
$failures = [System.Collections.Generic.List[string]]::new()

function Add-Failure {
    param([Parameter(Mandatory)][string]$Message)
    $script:failures.Add($Message)
}

function Get-MarkdownCells {
    param([Parameter(Mandatory)][string]$Line)
    return @($Line.Trim().Trim('|').Split('|') | ForEach-Object { $_.Trim() })
}

function Test-ExactColumns {
    param(
        [Parameter(Mandatory)][string]$Source,
        [Parameter(Mandatory)][string[]]$Actual
    )

    $missing = @($requiredColumns | Where-Object { $_ -notin $Actual })
    if ($missing.Count -gt 0) {
        Add-Failure "$Source no contiene columnas obligatorias: $($missing -join ', ')."
    }

    if (($Actual -join '|') -cne ($requiredColumns -join '|')) {
        Add-Failure "$Source no conserva el nombre y orden estable de las columnas."
    }
}

function Test-RequirementSet {
    param(
        [Parameter(Mandatory)][string]$Source,
        [Parameter(Mandatory)][object[]]$Rows
    )

    $expectedIds = @($canonicalRequirements.ID)
    $actualIds = @($Rows | ForEach-Object { [string]$_.ID })

    foreach ($group in @($actualIds | Group-Object | Where-Object Count -gt 1)) {
        Add-Failure "$Source contiene el ID duplicado '$($group.Name)'."
    }

    foreach ($id in @($expectedIds | Where-Object { $_ -notin $actualIds })) {
        Add-Failure "$Source no contiene el requisito esperado '$id'."
    }

    foreach ($id in @($actualIds | Where-Object { $_ -notin $expectedIds } | Select-Object -Unique)) {
        Add-Failure "$Source contiene el ID inesperado '$id'."
    }

    foreach ($expected in $canonicalRequirements) {
        $matches = @($Rows | Where-Object ID -CEQ $expected.ID)
        if ($matches.Count -ne 1) {
            continue
        }

        foreach ($column in $canonicalColumns) {
            $actualValue = [string]$matches[0].$column
            $expectedValue = [string]$expected.$column
            if ($actualValue -cne $expectedValue) {
                Add-Failure "$Source altera '$column' de $($expected.ID). Esperado: '$expectedValue'. Actual: '$actualValue'."
            }
        }
    }
}

if (-not (Test-Path -LiteralPath $csvPath -PathType Leaf)) {
    Add-Failure "No existe '$csvPath'."
}
if (-not (Test-Path -LiteralPath $markdownPath -PathType Leaf)) {
    Add-Failure "No existe '$markdownPath'."
}
if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

$csvBytes = [System.IO.File]::ReadAllBytes($csvPath)
if ($csvBytes.Length -lt 3 -or $csvBytes[0] -ne 0xEF -or $csvBytes[1] -ne 0xBB -or $csvBytes[2] -ne 0xBF) {
    Add-Failure 'El CSV debe estar codificado como UTF-8 con BOM.'
}

$csvRows = @(Import-Csv -LiteralPath $csvPath -Delimiter ';' -Encoding utf8)
if ($csvRows.Count -eq 0) {
    Add-Failure 'El CSV no contiene filas de requisitos.'
    $csvColumns = @()
}
else {
    $csvColumns = @($csvRows[0].PSObject.Properties.Name)
}
Test-ExactColumns -Source 'CSV' -Actual $csvColumns
Test-RequirementSet -Source 'CSV' -Rows $csvRows

$markdownLines = @(Get-Content -LiteralPath $markdownPath -Encoding utf8)
$headerIndex = -1
for ($index = 0; $index -lt $markdownLines.Count; $index++) {
    if ($markdownLines[$index] -match '^\|\s*ID\s*\|') {
        $headerIndex = $index
        break
    }
}

$markdownRows = @()
$markdownColumns = @()
if ($headerIndex -lt 0) {
    Add-Failure 'Markdown no contiene la tabla de requisitos con columna ID.'
}
else {
    $markdownColumns = @(Get-MarkdownCells -Line $markdownLines[$headerIndex])
    Test-ExactColumns -Source 'Markdown' -Actual $markdownColumns

    for ($index = $headerIndex + 2; $index -lt $markdownLines.Count; $index++) {
        $line = $markdownLines[$index]
        if ($line -notmatch '^\|') {
            break
        }

        $cells = @(Get-MarkdownCells -Line $line)
        if ($cells.Count -ne $markdownColumns.Count) {
            Add-Failure "Markdown contiene una fila con $($cells.Count) celdas; se esperaban $($markdownColumns.Count): '$line'."
            continue
        }

        $row = [ordered]@{}
        for ($cellIndex = 0; $cellIndex -lt $markdownColumns.Count; $cellIndex++) {
            $row[$markdownColumns[$cellIndex]] = $cells[$cellIndex]
        }
        $markdownRows += [pscustomobject]$row
    }
}

Test-RequirementSet -Source 'Markdown' -Rows $markdownRows

foreach ($id in @($canonicalRequirements.ID)) {
    $csvMatches = @($csvRows | Where-Object ID -CEQ $id)
    $markdownMatches = @($markdownRows | Where-Object ID -CEQ $id)
    if ($csvMatches.Count -ne 1 -or $markdownMatches.Count -ne 1) {
        continue
    }

    foreach ($column in $requiredColumns) {
        $csvValue = [string]$csvMatches[0].$column
        $markdownValue = [string]$markdownMatches[0].$column
        if ($csvValue -cne $markdownValue) {
            Add-Failure "Diferencia semántica para $id en '$column'. CSV: '$csvValue'. Markdown: '$markdownValue'."
        }
    }
}

if ($failures.Count -gt 0) {
    Write-Host "FAIL: se detectaron $($failures.Count) errores de trazabilidad." -ForegroundColor Red
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host 'PASS: REQ-01 a REQ-14 son únicos, canónicos y equivalentes en CSV y Markdown.' -ForegroundColor Green
Write-Host 'PASS: Fuente o fundamento y Rol autorizado conservan su valor canónico exacto por requisito.' -ForegroundColor Green
Write-Host 'PASS: el CSV usa columnas estables, separador punto y coma y UTF-8 BOM.' -ForegroundColor Green
