$ErrorActionPreference = "Stop"

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Executable,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
  )

  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $Executable $($Arguments -join ' ')"
  }
}

$repositoryRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repositoryRoot

if (-not (Test-Path -LiteralPath ".env")) {
  Copy-Item -LiteralPath ".env.example" -Destination ".env"
  Write-Host "Created .env from the synthetic local template."
}

$environmentText = Get-Content -Raw -LiteralPath ".env"
if ($environmentText -notmatch 'APP_BASE_URL="http://127\.0\.0\.1:3000"' -or $environmentText -match '0\.0\.0\.0') {
  throw "Demo preparation requires APP_BASE_URL=http://127.0.0.1:3000 and refuses 0.0.0.0."
}

foreach ($variableName in @("DATABASE_URL", "POSTGRES_PASSWORD", "APP_BASE_URL", "DEMO_MODE", "DEMO_SESSION_TTL_HOURS", "CAREGIVER_DEMO_INVITATION_TTL_MINUTES", "CAREGIVER_DEMO_SESSION_TTL_HOURS", "SESSION_COOKIE_SECURE", "EXPLAINABLE_TRAFFIC_LIGHT")) {
  $match = [regex]::Match($environmentText, "(?m)^$variableName=`"([^`"]*)`"$")
  if ($match.Success) {
    Set-Item -Path "Env:$variableName" -Value $match.Groups[1].Value
  }
}

Write-Host "Starting loopback-only PostgreSQL without deleting local data..."
$existingPostgresContainer = & docker compose ps -q postgres
if ($LASTEXITCODE -ne 0) {
  throw "Could not inspect the PostgreSQL demo container."
}
if ($existingPostgresContainer) {
  Invoke-CheckedCommand docker compose start postgres
} else {
  Invoke-CheckedCommand docker compose up -d postgres
}
Invoke-CheckedCommand pnpm install --frozen-lockfile
Invoke-CheckedCommand pnpm prisma:generate
Invoke-CheckedCommand pnpm db:migrate:deploy
Invoke-CheckedCommand pnpm db:migrate:status
Invoke-CheckedCommand pnpm db:seed
Invoke-CheckedCommand pnpm traceability:check

Write-Host "Synthetic demo prepared. Run 'pnpm dev' and open http://127.0.0.1:3000"
