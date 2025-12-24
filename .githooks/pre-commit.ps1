#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'
$top = git rev-parse --show-toplevel

Write-Output '[githooks] Formatting frontend code...'
Set-Location "$top/kimai-aggregator"
if (Get-Command npm -ErrorAction SilentlyContinue) {
  npm run format -s || npx prettier --write 'src/**/*.{ts,tsx,css,js,jsx,json,md}'
  npm run lint -- --fix -s || $true
  git add -A
}

Write-Output '[githooks] Formatting backend code...'
Set-Location "$top/kimai-backend"
if (Get-Command cargo -ErrorAction SilentlyContinue) {
  cargo fmt --all
  git add -A
}

exit 0
