$ErrorActionPreference = "Stop"
& node (Join-Path $PSScriptRoot "prepare-demo.mjs")
exit $LASTEXITCODE
