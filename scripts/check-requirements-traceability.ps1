$ErrorActionPreference = "Stop"
& node (Join-Path $PSScriptRoot "check-requirements-traceability.mjs")
exit $LASTEXITCODE
