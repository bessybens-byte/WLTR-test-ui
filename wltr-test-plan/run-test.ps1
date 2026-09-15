$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5000'
$script:token = $null
$rawdir = Join-Path $PSScriptRoot 'rawdata'
$outdir = Join-Path $PSScriptRoot 'results'
New-Item -ItemType Directory -Force -Path $outdir | Out-Null

$curl = "$env:SystemRoot\System32\curl.exe"
Add-Type -AssemblyName System.Web | Out-Null

# Windows PowerShell 5.1's ConvertTo-Json expands strings into per-character objects
# once -Depth has budget below them, exploding exponentially on large rawText payloads.
# This flat, string-safe serializer avoids that pathology entirely.
function ConvertTo-JsonFast {
  param($v)
  if ($null -eq $v) { return 'null' }
  if ($v -is [bool]) { if ($v) { return 'true' } else { return 'false' } }
  if ($v -is [int] -or $v -is [long] -or $v -is [double] -or $v -is [single] -or $v -is [decimal]) {
    return ([System.IConvertible]$v).ToString([System.Globalization.CultureInfo]::InvariantCulture)
  }
  if ($v -is [System.Collections.IDictionary]) {
    $parts = foreach ($k in $v.Keys) { '"' + [System.Web.HttpUtility]::JavaScriptStringEncode([string]$k) + '":' + (ConvertTo-JsonFast $v[$k]) }
    return '{' + ($parts -join ',') + '}'
  }
  if ($v -is [System.Collections.IEnumerable] -and -not ($v -is [string])) {
    $parts = foreach ($item in $v) { ConvertTo-JsonFast $item }
    return '[' + ($parts -join ',') + ']'
  }
  return '"' + [System.Web.HttpUtility]::JavaScriptStringEncode([string]$v) + '"'
}

function Req {
  param([string]$Method,[string]$Path,$Body=$null,[string]$Token=$script:token,[switch]$Anon)
  $cargs = @('-s','-S','--max-time','60','--noproxy','*','-X',$Method,"$base$Path")
  if (-not $Anon -and $Token) { $cargs += @('-H',"Authorization: Bearer $Token") }
  $tmp = $null
  if ($null -ne $Body) {
    $json = (ConvertTo-JsonFast $Body)
    $tmp = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tmp, $json, (New-Object System.Text.UTF8Encoding($false)))
    $cargs += @('-H','Content-Type: application/json','--data-binary',"@$tmp")
  }
  $cargs += @('-w','__HTTP__%{http_code}')
  $out = (& $curl @cargs 2>$null) -join "`n"
  if ($tmp) { Remove-Item $tmp -ErrorAction SilentlyContinue }
  $status = -1; $content = $out
  if ($out -match '(?s)__HTTP__(\d+)\s*$') {
    $status = [int]$Matches[1]
    $content = ($out -replace '(?s)__HTTP__\d+\s*$','')
  }
  $obj = $null
  if ($content) { try { $obj = $content | ConvertFrom-Json } catch { $obj = $content } }
  $ok = ($status -ge 200 -and $status -lt 300)
  return [pscustomobject]@{ ok=$ok; status=$status; body=$obj; raw=$content }
}

function Step($n){ Write-Host ""; Write-Host "===== $n =====" -ForegroundColor Cyan }
function Ok($m){ Write-Host "  OK  $m" -ForegroundColor Green }
function Fail($m){ Write-Host "  ERR $m" -ForegroundColor Red }
function Die($m){ Fail $m; throw $m }

$sfx = Get-Date -Format 'yyMMddHHmmss'

# ---------------- Stage 0: root login ----------------
Step "0a. Root login"
$r = Req POST '/api/auth/login' @{ email='root@example.com'; password='Root#Admin123!' } -Anon
if (-not $r.ok) { Die "root login $($r.status): $($r.raw)" }
$rootTok = $r.body.accessToken
Ok "root token acquired"

# ---------------- Create laboratory ----------------
Step "0b. Create laboratory"
$script:token = $rootTok
$r = Req POST '/api/laboratories' @{ name="Aqua Env Labs $sfx"; address='1 Water Way'; city='Denver'; state='CO'; zipCode='80202'; contactName='Root Admin'; contactEmail='root@example.com' }
if (-not $r.ok) { Die "create lab $($r.status): $($r.raw)" }
$labId = $r.body.id
Ok "labId=$labId"

# ---------------- Find LabAdmin role ----------------
Step "0c. Resolve LabAdmin role id"
$r = Req GET "/api/Roles?laboratoryId=$labId&pageSize=100"
if (-not $r.ok) { Die "roles $($r.status): $($r.raw)" }
$items = $r.body.items; if (-not $items) { $items = $r.body }
$labAdmin = $items | Where-Object { $_.name -eq 'LabAdmin' -or $_.displayName -eq 'LabAdmin' } | Select-Object -First 1
if (-not $labAdmin) { Write-Host ($r.raw); Die 'LabAdmin role not found' }
$labAdminRoleId = $labAdmin.id
if (-not $labAdminRoleId) { $labAdminRoleId = $labAdmin.roleId }
Ok "labAdminRoleId=$labAdminRoleId"

# ---------------- Invite lab user ----------------
Step "0d. Invite lab user"
$labEmail = "analyst+$sfx@aqua.test"
$labPass  = 'Analyst#123!'
$r = Req POST '/api/Invitations' @{ email=$labEmail; laboratoryId=$labId; initialRoleId=$labAdminRoleId }
if (-not $r.ok) { Die "invite $($r.status): $($r.raw)" }
$rawToken = $r.body.rawToken
Ok "invitation token acquired"

# ---------------- Accept invite ----------------
Step "0e. Accept invite"
$r = Req POST '/api/auth/accept-invite' @{ token=$rawToken; password=$labPass } -Anon
if (-not $r.ok) { Die "accept $($r.status): $($r.raw)" }
Ok "user created"

# ---------------- Login as lab user ----------------
Step "0f. Login as lab user + get profile"
$r = Req POST '/api/auth/login' @{ email=$labEmail; password=$labPass } -Anon
if (-not $r.ok) { Die "lab login $($r.status): $($r.raw)" }
$labTok = $r.body.accessToken
$script:token = $labTok
$r = Req GET '/api/auth/me'
if (-not $r.ok) { Die "me $($r.status): $($r.raw)" }
$userId = $r.body.userId
Ok "userId=$userId  roles=$($r.body.roleNames -join ',')  perms=$($r.body.permissions -join ',')"

# ---------------- Create technician (as root, platform op) ----------------
Step "0g. Create LabTechnician profile"
$script:token = $rootTok
$r = Req POST '/api/LabTechnicians' @{ identityUserId=$userId; laboratoryId=$labId; firstName='Ana'; lastName='Lyst'; qualifications='VOC GC/MS' }
if (-not $r.ok) { Die "technician $($r.status): $($r.raw)" }
Ok "technician created id=$($r.body.id)"

# switch to lab user for all lab-scoped work
$script:token = $labTok

# ---------------- Instrument ----------------
Step "1. Create instrument GC/MS #4"
$r = Req POST '/api/instruments' @{ name='GC/MS #4'; instrumentType='GC/MS'; manufacturer='Agilent'; model='MS4' }
if (-not $r.ok) { Die "instrument $($r.status): $($r.raw)" }
$instrId = $r.body.id
Ok "instrId=$instrId"

# ---------------- Internal standard ----------------
Step "2. Create internal standard Fluorobenzene (10)"
$r = Req POST '/api/internal-standards' @{ name='Fluorobenzene'; concentration=10 }
if (-not $r.ok) { Die "IS $($r.status): $($r.raw)" }
$isId = $r.body.id
Ok "isId=$isId"

# ---------------- Analytes ----------------
Step "3. Create 3 target analytes"
$analyteNames = @('Dichlorodifluoromethane','Vinyl Chloride-C','Bromomethane')
$analyteIds = @{}
foreach ($nm in $analyteNames) {
  $r = Req POST '/api/analytes' @{ name=$nm; defaultInternalStandardId=$isId; role='Target' }
  if (-not $r.ok) { Die "analyte '$nm' $($r.status): $($r.raw)" }
  $analyteIds[$nm] = $r.body.id
  Ok "$nm => $($r.body.id)"
}

# ---------------- Calibration levels ----------------
Step "4. Create 13 calibration levels"
$levels = @(
 @{n='Cal 1'; c=0.1; f='cal-01_0.1ugL_0120-06.txt'},
 @{n='Cal 2'; c=0.2; f='cal-02_0.2ugL_0120-07.txt'},
 @{n='Cal 3'; c=0.5; f='cal-03_0.5ugL_0120-08.txt'},
 @{n='Cal 4'; c=1.0; f='cal-04_1ugL_0120-09.txt'},
 @{n='Cal 5'; c=2.0; f='cal-05_2ugL_0120-10.txt'},
 @{n='Cal 6'; c=4.0; f='cal-06_4ugL_0120-11.txt'},
 @{n='Cal 7'; c=8.0; f='cal-07_8ugL_0120-12.txt'},
 @{n='Cal 8'; c=20.0; f='cal-08_20ugL_0120-13.txt'},
 @{n='Cal 9'; c=50.0; f='cal-09_50ugL_0120-14.txt'},
 @{n='Cal 10'; c=100.0; f='cal-10_100ugL_0120-16.txt'},
 @{n='Cal 11'; c=120.0; f='cal-11_120ugL_0120-18.txt'},
 @{n='Cal 12'; c=140.0; f='cal-12_140ugL_0120-20.txt'},
 @{n='Cal 13'; c=160.0; f='cal-13_160ugL_0120-22.txt'}
)
$i = 0
foreach ($lv in $levels) {
  $i++
  $r = Req POST '/api/calibration-levels' @{ levelName=$lv.n; trueConcentration=$lv.c; sortOrder=$i }
  if (-not $r.ok) { Die "level '$($lv.n)' $($r.status): $($r.raw)" }
}
Ok "13 levels created"

# ---------------- Method config ----------------
Step "5. Create method config"
$cfg = @{
  name='VOC by GC/MS (624/8260)'
  labelMode='RSquared'
  quantitationMode='InternalStandard'
  minCorrelation=0.990025
  maxRSE=15.0
  pctDiffLowBound=-20.0
  pctDiffHighBound=20.0
  minPointsRequired=4
  maxMissedPoints=2
  icvLimitPercent=20.0
  rsdPercentLimit=15.0
  isRsdPercentLimit=20.0
  icvCdsParityPercent=0.01
  soilDilutionFactor=50.0
  aqueousDilutionFactor=1.0
}
$r = Req POST '/api/method-configs' $cfg
if (-not $r.ok) { Die "method config $($r.status): $($r.raw)" }
$cfgId = $r.body.id
Ok "cfgId=$cfgId"

# ---------------- Upload 13 CAL runs ----------------
Step "6. Upload 13 CAL runs"
$calRunIds = @()
foreach ($lv in $levels) {
  $txt = Get-Content -Raw (Join-Path $rawdir $lv.f)
  $body = @{ runType='CAL'; instrumentId=$instrId; level=$lv.n; runDate='2023-01-20T20:24:00Z'; rawText=$txt; name=("CAL "+$lv.n) }
  $r = Req POST '/api/runs' $body
  if (-not $r.ok) { Die "upload '$($lv.n)' $($r.status): $($r.raw)" }
  $calRunIds += $r.body.id
  $mc = $r.body.measurementCount; if ($null -eq $mc) { $mc = $r.body.measurementsParsed }
  Ok "$($lv.n): id=$($r.body.id) status=$($r.body.status) measurements=$mc warnings=$($r.body.parseWarnings.Count)"
}

# ---------------- Upload ICV ----------------
Step "7. Upload ICV run"
$txt = Get-Content -Raw (Join-Path $rawdir 'icv-01_0120-25.txt')
$r = Req POST '/api/runs' @{ runType='ICV'; instrumentId=$instrId; runDate='2023-01-21T02:59:00Z'; rawText=$txt; name='ICV' }
if (-not $r.ok) { Die "icv $($r.status): $($r.raw)" }
$icvId = $r.body.id
Ok "icvId=$icvId status=$($r.body.status)"

# ---------------- Verify measurements on Cal 4 ----------------
Step "8. Verify response ratios on Cal 4 (1 ug/L)"
$cal4Id = $calRunIds[3]
$r = Req GET "/api/runs/$cal4Id/measurements?pageSize=200"
if ($r.ok) {
  $ms = $r.body.items; if (-not $ms) { $ms = $r.body }
  foreach ($nm in $analyteNames) {
    $m = $ms | Where-Object { $_.compoundName -eq $nm -or $_.analyteName -eq $nm -or $_.rawCompoundName -eq $nm } | Select-Object -First 1
    if ($m) { Ok ("{0}: resp={1} isResp={2} ratio={3}" -f $nm,$m.response,$m.internalStandardResponse,$m.responseRatio) }
    else { Fail "$nm not found in measurements" }
  }
  $r.body | ConvertTo-Json -Depth 12 | Out-File (Join-Path $outdir 'cal4-measurements.json')
} else { Fail "measurements $($r.status): $($r.raw)" }

# ---------------- Create group ----------------
Step "9. Create calibration group"
$r = Req POST '/api/calibration-groups' @{ name='MS4 VOC ICAL 2023-01-20'; instrumentId=$instrId; methodConfigId=$cfgId; calRunIds=$calRunIds; icvRunId=$icvId }
if (-not $r.ok) { Die "group $($r.status): $($r.raw)" }
$groupId = $r.body.id
Ok "groupId=$groupId"

# ---------------- Readiness ----------------
Step "10. Readiness check"
$r = Req GET "/api/calibration-groups/$groupId/readiness"
if ($r.ok) { Ok "isReady=$($r.body.isReady) blocking=$($r.body.blockingIssues.Count) warnings=$($r.body.warnings.Count)"; $r.body | ConvertTo-Json -Depth 12 | Out-File (Join-Path $outdir 'readiness.json') }
else { Fail "readiness $($r.status): $($r.raw)" }

# ---------------- Compute ----------------
Step "11. Compute"
$r = Req POST "/api/calibration-groups/$groupId/compute"
if (-not $r.ok) { Die "compute $($r.status): $($r.raw)" }
Ok "computed status=$($r.body.status) snapshot=$($r.body.methodConfigSnapshotId) stale=$($r.body.isComputationStale)"
$r.body | ConvertTo-Json -Depth 12 | Out-File (Join-Path $outdir 'compute.json')

# ---------------- Report card ----------------
Step "12. Report card"
$r = Req GET "/api/calibration-groups/$groupId/report-card"
if (-not $r.ok) { Die "report-card $($r.status): $($r.raw)" }
$r.body | ConvertTo-Json -Depth 20 | Out-File (Join-Path $outdir 'report-card.json')
Ok "report-card saved"
$anaCard = $r.body.analytes; if (-not $anaCard) { $anaCard = $r.body.perAnalyte }
foreach ($a in $anaCard) {
  $rec = $a.recommendedModel; if (-not $rec) { $rec = "$($a.recommendedRegressionType)/$($a.recommendedWeightingMode)" }
  Write-Host ("    {0}: recommended={1}" -f ($a.analyteName), $rec)
}

# ---------------- Select recommended models ----------------
Step "13. Select recommended models"
$r = Req POST "/api/calibration-groups/$groupId/select-recommended-models" @{ excludeForcedZero=$false }
if (-not $r.ok) { Fail "select-recommended $($r.status): $($r.raw)" } else { Ok "recommended models selected" }

# ---------------- Report ----------------
Step "14. Summary report"
$r = Req GET "/api/calibration-groups/$groupId/report"
if (-not $r.ok) { Die "report $($r.status): $($r.raw)" }
$r.body | ConvertTo-Json -Depth 25 | Out-File (Join-Path $outdir 'report.json')
Ok "report saved to results/report.json"

# ---------------- Approve ----------------
Step "15. Approve"
$r = Req POST "/api/calibration-groups/$groupId/approve" @{ comment='Validated against MS4 workbook' }
if (-not $r.ok) { Fail "approve $($r.status): $($r.raw)" } else { Ok "approved status=$($r.body.status)" }

Write-Host ""
Write-Host "DONE. groupId=$groupId  results in $outdir" -ForegroundColor Yellow
