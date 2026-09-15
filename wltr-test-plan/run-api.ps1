#requires -Version 5.1
<#
.SYNOPSIS
  Starts the WLTR API against a throwaway local database with known seed credentials, for the
  end-to-end parity harness (run-e2e.ps1).

.DESCRIPTION
  Overrides configuration via environment variables (which outrank user-secrets and appsettings):
    - ConnectionStrings:DefaultConnection -> a fresh LocalDB database (default WltrHandover)
    - Seed:RootAdmin:Email / Password     -> credentials the harness logs in with
    - Jwt:SigningKey                      -> a local-only signing key

  The API auto-migrates and seeds roles + root admin on first startup (DatabaseBootstrapper),
  so pointing at a brand-new database name yields a clean, reproducible environment. This uses
  only local dev values; no production secrets are involved.

.PARAMETER Database
  Fresh database name. Default WltrHandover. Delete it between runs for a pristine start.
#>
[CmdletBinding()]
param(
  [string]$Database = 'WltrHandover',
  [string]$RootEmail = 'root@handover.local',
  [string]$RootPassword = 'Root#Admin123!',
  [string]$SigningKey = 'LOCAL_ONLY_E2E_HANDOVER_SIGNING_KEY_32CHARS_MIN!!'
)

$repoRoot = Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..\..')
$env:ConnectionStrings__DefaultConnection = "Server=(localdb)\MSSQLLocalDB;Database=$Database;Trusted_Connection=True;TrustServerCertificate=True"
$env:Seed__RootAdmin__Email = $RootEmail
$env:Seed__RootAdmin__Password = $RootPassword
$env:Jwt__SigningKey = $SigningKey
$env:ASPNETCORE_ENVIRONMENT = 'Development'

Write-Host "Starting WLTR API on http://localhost:5000 (DB: $Database, root: $RootEmail)" -ForegroundColor Cyan
Push-Location (Join-Path $repoRoot 'backend')
try {
  dotnet run --project src/Api --launch-profile http --environment Development
}
finally {
  Pop-Location
}
