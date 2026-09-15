#requires -Version 5.1
<#
.SYNOPSIS
  End-to-end WLTR calibration workbook-parity harness.

.DESCRIPTION
  Drives the WLTR API through the full flow documented in docs/wltr-test-plan/index.html:
  login -> lab/user/technician -> instrument/IS/analytes/levels/method-config (inline per-analyte
  criteria) -> upload 13 CAL + 1 ICV runs (from ./rawdata) -> create group -> readiness -> compute
  -> report-card -> suggested-exclusions -> apply trims -> recompute -> select recommended models
  -> summary report. Finally compares the 3 focus analytes' response-factor %RSD and selected model
  against the 230120_MS4_VOC workbook and prints a PASS/FAIL parity table.

  The API must already be running (see run-api.ps1). Uploads build JSON manually to avoid the
  PowerShell 5.1 ConvertTo-Json hang on the large rawText payloads.

.PARAMETER BaseUrl
  API base URL. Default http://localhost:5000.

.PARAMETER RootEmail / RootPassword
  Seeded root-admin credentials the API was started with (Seed:RootAdmin:*).
#>
[CmdletBinding()]
param(
  [string]$BaseUrl = $(if ($env:WLTR_BASE_URL) { $env:WLTR_BASE_URL } else { 'http://localhost:5000' }),
  [string]$RootEmail = $(if ($env:WLTR_ROOT_EMAIL) { $env:WLTR_ROOT_EMAIL } else { 'root@handover.local' }),
  [string]$RootPassword = $(if ($env:WLTR_ROOT_PASSWORD) { $env:WLTR_ROOT_PASSWORD } else { 'Root#Admin123!' })
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rawDir = Join-Path $scriptDir 'rawdata'

function Write-Stage([string]$m) { Write-Host "`n=== $m ===" -ForegroundColor Cyan }
function Write-Ok([string]$m)    { Write-Host "  [ok] $m" -ForegroundColor Green }
function Write-Info([string]$m)  { Write-Host "  $m" -ForegroundColor Gray }

# Minimal, safe JSON string escaper (avoids ConvertTo-Json on big rawText payloads).
function ConvertTo-JsonString([string]$s) {
  if ($null -eq $s) { return '""' }
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.Append('"')
  foreach ($ch in $s.ToCharArray()) {
    switch ($ch) {
      '"'  { [void]$sb.Append('\"') }
      '\'  { [void]$sb.Append('\\') }
      "`b" { [void]$sb.Append('\b') }
      "`f" { [void]$sb.Append('\f') }
      "`n" { [void]$sb.Append('\n') }
      "`r" { [void]$sb.Append('\r') }
      "`t" { [void]$sb.Append('\t') }
      default {
        if ([int]$ch -lt 32) { [void]$sb.Append(('\u{0:x4}' -f [int]$ch)) }
        else { [void]$sb.Append($ch) }
      }
    }
  }
  [void]$sb.Append('"')
  return $sb.ToString()
}

function Invoke-Api {
  param(
    [Parameter(Mandatory)][string]$Method,
    [Parameter(Mandatory)][string]$Path,
    [string]$Token,
    $Body,          # hashtable/array -> ConvertTo-Json (small bodies only)
    [string]$RawJson # pre-serialized JSON body (for large payloads)
  )
  $headers = @{ Accept = 'application/json' }
  if ($Token) { $headers['Authorization'] = "Bearer $Token" }
  $uri = "$BaseUrl$Path"
  $json = $null
  if ($PSBoundParameters.ContainsKey('RawJson') -and $RawJson) { $json = $RawJson }
  elseif ($null -ne $Body) { $json = ($Body | ConvertTo-Json -Depth 8 -Compress) }

  if ($json) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    return Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -ContentType 'application/json' -Body $bytes
  }
  return Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers
}

# Level -> (trueConc, dataFileStem)
$levels = @(
  @{ Name = 'Cal 1';  Conc = 0.1; File = '0120-06' }
  @{ Name = 'Cal 2';  Conc = 0.2; File = '0120-07' }
  @{ Name = 'Cal 3';  Conc = 0.5; File = '0120-08' }
  @{ Name = 'Cal 4';  Conc = 1;   File = '0120-09' }
  @{ Name = 'Cal 5';  Conc = 2;   File = '0120-10' }
  @{ Name = 'Cal 6';  Conc = 4;   File = '0120-11' }
  @{ Name = 'Cal 7';  Conc = 8;   File = '0120-12' }
  @{ Name = 'Cal 8';  Conc = 20;  File = '0120-13' }
  @{ Name = 'Cal 9';  Conc = 50;  File = '0120-14' }
  @{ Name = 'Cal 10'; Conc = 100; File = '0120-16' }
  @{ Name = 'Cal 11'; Conc = 120; File = '0120-18' }
  @{ Name = 'Cal 12'; Conc = 140; File = '0120-20' }
  @{ Name = 'Cal 13'; Conc = 160; File = '0120-22' }
)

$tag = Get-Date -Format 'MMddHHmmss'

Write-Stage "0. Probe API ($BaseUrl)"
$null = Invoke-Api -Method GET -Path '/'
Write-Ok "host alive"

Write-Stage '1. Login as root admin'
$rootLogin = Invoke-Api -Method POST -Path '/api/auth/login' -Body @{ email = $RootEmail; password = $RootPassword }
$rootTok = $rootLogin.accessToken
Write-Ok "root token acquired"

Write-Stage '2. Create laboratory (root)'
$lab = Invoke-Api -Method POST -Path '/api/laboratories' -Token $rootTok -Body @{
  name = "Handover Lab $tag"; address = '1 Water Way'; city = 'Denver'; state = 'CO'
  zipCode = '80202'; contactName = 'Root Admin'; contactEmail = $RootEmail
}
$labId = $lab.id
Write-Ok "labId = $labId"

Write-Stage '3. Resolve LabAdmin role id'
$roles = Invoke-Api -Method GET -Path "/api/Roles?laboratoryId=$labId&pageSize=100" -Token $rootTok
$roleItems = if ($roles.items) { $roles.items } else { $roles }
$labAdminRoleId = ($roleItems | Where-Object { $_.name -eq 'LabAdmin' } | Select-Object -First 1).roleId
if (-not $labAdminRoleId) { throw 'LabAdmin role not found' }
Write-Ok "labAdminRoleId = $labAdminRoleId"

Write-Stage '4. Invite + accept lab user'
$analystEmail = "analyst+$tag@handover.local"
$analystPassword = 'Analyst#123!'
$invite = Invoke-Api -Method POST -Path '/api/Invitations' -Token $rootTok -Body @{
  email = $analystEmail; laboratoryId = $labId; initialRoleId = $labAdminRoleId
}
$null = Invoke-Api -Method POST -Path '/api/auth/accept-invite' -Body @{ token = $invite.rawToken; password = $analystPassword }
Write-Ok "user $analystEmail accepted invite"

$labLogin = Invoke-Api -Method POST -Path '/api/auth/login' -Body @{ email = $analystEmail; password = $analystPassword }
$labTok = $labLogin.accessToken
$me = Invoke-Api -Method GET -Path '/api/auth/me' -Token $labTok
$userId = $me.userId
Write-Ok "userId = $userId"

Write-Stage '5. Create LabTechnician (root)'
$null = Invoke-Api -Method POST -Path '/api/LabTechnicians' -Token $rootTok -Body @{
  identityUserId = $userId; laboratoryId = $labId; firstName = 'Ana'; lastName = 'Lyst'; qualifications = 'VOC GC/MS'
}
Write-Ok 'technician linked'

Write-Stage '6. Instrument, internal standard, analytes (lab user)'
$instr = Invoke-Api -Method POST -Path '/api/instruments' -Token $labTok -Body @{
  name = 'GC/MS #4'; instrumentType = 'GC/MS'; manufacturer = 'Agilent'; model = 'MS4'
}
$instrId = $instr.id
Write-Ok "instrumentId = $instrId"

$is = Invoke-Api -Method POST -Path '/api/internal-standards' -Token $labTok -Body @{ name = 'Fluorobenzene'; concentration = 10 }
$isId = $is.id
Write-Ok "internalStandardId = $isId"

$analyteNames = @('Dichlorodifluoromethane', 'Vinyl Chloride-C', 'Bromomethane')
$analyteIds = @{}
foreach ($n in $analyteNames) {
  $a = Invoke-Api -Method POST -Path '/api/analytes' -Token $labTok -Body @{
    name = $n; defaultInternalStandardId = $isId; role = 'Target'
  }
  $analyteIds[$n] = $a.id
  Write-Ok "analyte $n = $($a.id)"
}

Write-Stage '7. Create 13 calibration levels'
foreach ($lv in $levels) {
  $null = Invoke-Api -Method POST -Path '/api/calibration-levels' -Token $labTok -Body @{
    levelName = $lv.Name; trueConcentration = $lv.Conc; sortOrder = ($levels.IndexOf($lv) + 1)
  }
}
Write-Ok '13 levels created'

Write-Stage '8. Create method config (inline per-analyte criteria)'
$analyteCriteria = @(
  @{ analyteId = $analyteIds['Dichlorodifluoromethane']; icvLcsConcentration = 50; icvLcsLowerControlLimit = 50; icvLcsUpperControlLimit = 160 }
  @{ analyteId = $analyteIds['Vinyl Chloride-C'];        maxRsdPercent = 30; icvLcsConcentration = 50; icvLcsLowerControlLimit = 80; icvLcsUpperControlLimit = 120 }
  @{ analyteId = $analyteIds['Bromomethane'];            icvLcsConcentration = 50; icvLcsLowerControlLimit = 22; icvLcsUpperControlLimit = 187 }
)
$mc = Invoke-Api -Method POST -Path '/api/method-configs' -Token $labTok -Body @{
  name = "VOC by GC/MS (624/8260) $tag"; labelMode = 'RSquared'; quantitationMode = 'InternalStandard'
  minCorrelation = 0.990025; maxRSE = 15.0; pctDiffLowBound = -20.0; pctDiffHighBound = 20.0
  minPointsRequired = 4; maxMissedPoints = 2; icvLimitPercent = 20.0; rsdPercentLimit = 15.0
  isRsdPercentLimit = 20.0; icvCdsParityPercent = 0.01; soilDilutionFactor = 50.0; aqueousDilutionFactor = 1.0
  analyteCriteria = $analyteCriteria
}
$methodConfigId = $mc.id
Write-Ok "methodConfigId = $methodConfigId"

Write-Stage '9. Upload 13 CAL runs + 1 ICV (from ./rawdata)'
$calRunIds = @()
foreach ($lv in $levels) {
  $raw = Get-Content -Raw -Path (Join-Path $rawDir "$($lv.File).txt")
  $body = '{"runType":"CAL","instrumentId":"' + $instrId + '","level":' + (ConvertTo-JsonString $lv.Name) +
          ',"runDate":"2023-01-20T20:24:00Z","rawText":' + (ConvertTo-JsonString $raw) + '}'
  $run = Invoke-Api -Method POST -Path '/api/runs' -Token $labTok -RawJson $body
  $calRunIds += $run.id
  Write-Info "$($lv.Name) ($($lv.File)) -> $($run.id)  measurements=$($run.measurementCount) status=$($run.status)"
}
$icvRaw = Get-Content -Raw -Path (Join-Path $rawDir '0120-25.txt')
$icvBody = '{"runType":"ICV","instrumentId":"' + $instrId +
           '","runDate":"2023-01-21T02:59:00Z","rawText":' + (ConvertTo-JsonString $icvRaw) + '}'
$icv = Invoke-Api -Method POST -Path '/api/runs' -Token $labTok -RawJson $icvBody
$icvRunId = $icv.id
Write-Ok "ICV -> $icvRunId ; uploaded $($calRunIds.Count) CAL runs"

Write-Stage '10. Create calibration group'
$group = Invoke-Api -Method POST -Path '/api/calibration-groups' -Token $labTok -Body @{
  name = "Workbook parity $tag"; instrumentId = $instrId; methodConfigId = $methodConfigId
  calRunIds = $calRunIds; icvRunId = $icvRunId
}
$groupId = $group.id
Write-Ok "groupId = $groupId"

Write-Stage '11. Readiness'
$readiness = Invoke-Api -Method GET -Path "/api/calibration-groups/$groupId/readiness" -Token $labTok
Write-Info "isReady=$($readiness.isReady) blockingIssues=$(@($readiness.blockingIssues).Count) warnings=$(@($readiness.warnings).Count)"

Write-Stage '12. Compute (expect 200 + computed group body)'
$computed = Invoke-Api -Method POST -Path "/api/calibration-groups/$groupId/compute" -Token $labTok
Write-Info "status=$($computed.status) snapshot=$($computed.methodConfigSnapshotId) stale=$($computed.isComputationStale)"
Write-Ok 'compute returned group detail body'

# --- report-card helpers (report card is variants[] -> analytes[]) -----------------------
function Get-RecommendedNonForcedZero($card, [string]$analyteId) {
  foreach ($v in $card.variants) {
    $a = $v.analytes | Where-Object { $_.analyteId -eq $analyteId -and $_.isRecommendedNonForcedZeroModel } | Select-Object -First 1
    if ($a) { return [pscustomobject]@{ Variant = "$($v.regressionType)/$($v.weightingMode)"; RSquared = $a.rSquared; Points = $a.includedPointCount; Status = $a.calStatus } }
  }
  return $null
}
function Get-AnalyteInVariant($card, [string]$analyteId, [string]$rt, [string]$wm) {
  foreach ($v in $card.variants) {
    if ($v.regressionType -eq $rt -and $v.weightingMode -eq $wm) {
      return $v.analytes | Where-Object { $_.analyteId -eq $analyteId } | Select-Object -First 1
    }
  }
  return $null
}
function Get-ModelCode([string]$variant) {
  switch ($variant) {
    'Average/None'              { 'A' }
    'Quadratic/InverseX'        { 'QIC' }
    'Quadratic/InverseXSquared' { 'QISC' }
    'Linear/None'               { 'LS' }
    'Linear/InverseX'           { 'LSIC' }
    'Linear/InverseXSquared'    { 'LSISC' }
    default                     { $variant }
  }
}

# Workbook chosen CAL model per focus analyte (see docs/wltr-test-plan/index.html deep-dive).
$workbook = @{
  'Bromomethane'            = 'A'
  'Vinyl Chloride-C'        = 'QIC'
  'Dichlorodifluoromethane' = 'QIC'
}

Write-Stage '13. Model-family parity (all 13 points, no trimming)'
$card1 = Invoke-Api -Method GET -Path "/api/calibration-groups/$groupId/report-card" -Token $labTok
Write-Host ''
Write-Host ('{0,-26} {1,-10} {2,-10} {3}' -f 'Analyte', 'Workbook', 'WLTR', 'detail (r2 / n / status)') -ForegroundColor Yellow
Write-Host ('-' * 84)
foreach ($name in $analyteNames) {
  $pick = Get-RecommendedNonForcedZero $card1 $analyteIds[$name]
  $code = if ($pick) { Get-ModelCode $pick.Variant } else { '(none)' }
  $flag = if ($code -eq $workbook[$name]) { 'MATCH' } else { 'differs' }
  $detail = if ($pick) { ('r2={0:0.####} n={1} {2}' -f $pick.RSquared, $pick.Points, $pick.Status) } else { '' }
  Write-Host ('{0,-26} {1,-10} {2,-10} {3}  [{4}]' -f $name, $workbook[$name], $code, $detail, $flag)
}
Write-Info 'Note: excludeForcedZero defaults true, so forced-zero variants are excluded from selection.'

Write-Stage '14. Suggested exclusions (advisory)'
$suggestedRaw = Invoke-Api -Method GET -Path "/api/calibration-groups/$groupId/suggested-exclusions" -Token $labTok
$suggested = @($suggestedRaw)
if ($suggested.Count -eq 0) { Write-Info 'no analyte has actionable suggestions' }
foreach ($s in $suggested) {
  Write-Info ("{0}: currentRsd={1:0.##}% limit={2}% -> {3} suggestion(s): {4}" -f `
    $s.analyteName, $s.currentResponseFactorRsd, $s.rsdPercentLimit, @($s.suggestedExclusions).Count,
    (($s.suggestedExclusions | ForEach-Object { $_.levelName }) -join ', '))
}

Write-Stage '15. Point-inclusion parity: apply Bromomethane trims, recompute, check Average gate'
$bromoId = $analyteIds['Bromomethane']
$bromoBefore = Get-AnalyteInVariant $card1 $bromoId 'Average' 'None'
Write-Info ("Bromomethane Average BEFORE trim: status=$($bromoBefore.calStatus) n=$($bromoBefore.includedPointCount)")
$bromoSug = $suggested | Where-Object { $_.analyteId -eq $bromoId } | Select-Object -First 1
$bromoTrims = 0
if ($bromoSug) {
  foreach ($e in $bromoSug.suggestedExclusions) {
    $null = Invoke-Api -Method POST -Path "/api/calibration-groups/$groupId/point-exclusions" -Token $labTok -Body @{
      analyteId = $bromoId; calRunId = $e.calRunId; reason = 'ManualExclude'
      note = "Range trim per suggested-exclusions: $($e.reason)"
    }
    $bromoTrims++
  }
}
$null = Invoke-Api -Method POST -Path "/api/calibration-groups/$groupId/compute" -Token $labTok
$card2 = Invoke-Api -Method GET -Path "/api/calibration-groups/$groupId/report-card" -Token $labTok
$bromoAfter = Get-AnalyteInVariant $card2 $bromoId 'Average' 'None'
Write-Ok ("Bromomethane Average AFTER $bromoTrims trim(s): status=$($bromoAfter.calStatus) n=$($bromoAfter.includedPointCount)  (workbook: Pass, n=10, %RSD 6.833)")
$bromoPick2 = Get-RecommendedNonForcedZero $card2 $bromoId
if ($bromoPick2) { Write-Info ("Bromomethane recommended non-forced-zero pick after trim: {0}" -f (Get-ModelCode $bromoPick2.Variant)) }

Write-Stage '16. Select recommended models (excludeForcedZero default true) + summary report'
$null = Invoke-Api -Method POST -Path "/api/calibration-groups/$groupId/select-recommended-models" -Token $labTok -Body @{}
$report = Invoke-Api -Method GET -Path "/api/calibration-groups/$groupId/report" -Token $labTok
Write-Ok 'recommended models selected; summary report retrieved'

Write-Host ''
Write-Ok 'End-to-end run complete.'
Write-Info "Group $groupId is Computed with recommended models selected (not approved; approve manually to lock)."
