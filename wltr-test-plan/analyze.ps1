$ErrorActionPreference='Stop'
$d = Join-Path $PSScriptRoot 'results'
$report = Get-Content -Raw "$d\report.json" | ConvertFrom-Json
$card   = Get-Content -Raw "$d\report-card.json" | ConvertFrom-Json
$ready  = Get-Content -Raw "$d\readiness.json" | ConvertFrom-Json

function Rsd($vals){
  $m = ($vals | Measure-Object -Average).Average
  $n = $vals.Count
  if($n -lt 2 -or $m -eq 0){ return 0 }
  $ss = 0.0; foreach($v in $vals){ $ss += [math]::Pow($v-$m,2) }
  $sd = [math]::Sqrt($ss/($n-1))
  return [math]::Round(100.0*$sd/$m,3)
}

# x (concentration ratio = trueConc/10) -> level label
$xToLevel = @{ '0.01'='Cal1';'0.02'='Cal2';'0.05'='Cal3';'0.1'='Cal4';'0.2'='Cal5';'0.4'='Cal6';'0.8'='Cal7';'2'='Cal8';'5'='Cal9';'10'='Cal10';'12'='Cal11';'14'='Cal12';'16'='Cal13' }

# Workbook per-level RF (source of truth), keyed by level
$wb = @{
 'Bromomethane' = @{ mean=0.201983; rsd=6.833; r2=1.0; model='A(Average/None)';
   rf=@{ Cal3=0.23478;Cal4=0.21185;Cal5=0.20071;Cal6=0.20782;Cal7=0.20125;Cal8=0.19286;Cal9=0.19069;Cal10=0.19878;Cal11=0.19388;Cal12=0.18721 } }
 'Vinyl Chloride-C' = @{ mean=0.299803; rsd=12.753; r2=0.997915; model='QIC(Quadratic/InverseX)';
   rf=@{ Cal1=0.33119;Cal2=0.33018;Cal3=0.29479;Cal4=0.32741;Cal5=0.31614;Cal6=0.35143;Cal7=0.32660;Cal8=0.30756;Cal9=0.27515;Cal10=0.25702;Cal11=0.24720;Cal12=0.23295 } }
 'Dichlorodifluoromethane' = @{ mean=0.196300; rsd=21.331; r2=0.994862; model='QIC(Quadratic/InverseX)';
   rf=@{ Cal1=0.18785;Cal2=0.19586;Cal3=0.16888;Cal4=0.22265;Cal5=0.20494;Cal6=0.27589;Cal7=0.24130;Cal8=0.21037;Cal9=0.17624;Cal10=0.14492;Cal11=0.13040 } }
}

Write-Host "==================== PER-LEVEL RESPONSE FACTOR: WLTR vs WORKBOOK ====================" -ForegroundColor Cyan
foreach($rf in $report.responseFactors){
  $nm = $rf.analyteName
  if(-not $wb.ContainsKey($nm)){ continue }
  Write-Host "`n### $nm" -ForegroundColor Yellow
  Write-Host ("{0,-7} {1,-12} {2,-12} {3,-10} {4,-8} {5}" -f 'Level','WLTR_RF','WB_RF','deltaRF','incl','wbUsed')
  $wlAll = @(); $wlWbSubset=@()
  foreach($p in ($rf.points | Sort-Object x)){
    $xkey = ([string]([double]$p.x))
    $lvl = $xToLevel[$xkey]; if(-not $lvl){ $lvl = "x=$($p.x)" }
    $wlrf = [math]::Round($p.responseFactor,5)
    $wbrf = $null; if($wb[$nm].rf.ContainsKey($lvl)){ $wbrf = $wb[$nm].rf[$lvl] }
    $delta = ''; if($null -ne $wbrf){ $delta = [math]::Round($wlrf-$wbrf,5) }
    $wbUsed = ($null -ne $wbrf)
    Write-Host ("{0,-7} {1,-12} {2,-12} {3,-10} {4,-8} {5}" -f $lvl,$wlrf,$wbrf,$delta,$p.isIncluded,$wbUsed)
    $wlAll += $wlrf
    if($wbUsed){ $wlWbSubset += $wlrf }
  }
  $wlRsdAll = Rsd $wlAll
  $wlRsdSubset = Rsd $wlWbSubset
  Write-Host ("  WLTR reported: meanRF={0}  RF%RSD={1}  (over {2} pts, all isIncluded)" -f ([math]::Round($rf.meanResponseFactor,6)),([math]::Round($rf.responseFactorRsd,3)),$wlAll.Count) -ForegroundColor Green
  Write-Host ("  Recompute RSD over ALL {0} WLTR pts      = {1}%" -f $wlAll.Count,$wlRsdAll)
  Write-Host ("  Recompute RSD over WORKBOOK subset ({0} pts)= {1}%   <-- workbook says {2}%" -f $wlWbSubset.Count,$wlRsdSubset,$wb[$nm].rsd) -ForegroundColor Magenta
  Write-Host ("  meanRF over workbook subset = {0}   <-- workbook says {1}" -f ([math]::Round((($wlWbSubset|Measure-Object -Average).Average),6)),$wb[$nm].mean)
}

Write-Host "`n==================== MODEL SELECTION: WLTR vs WORKBOOK ====================" -ForegroundColor Cyan
foreach($rec in $card.analyteRecommendations){
  $nm=$rec.analyteName; if(-not $wb.ContainsKey($nm)){continue}
  Write-Host ("{0,-26} WLTR recommended={1}/{2}  nonForcedZero={3}/{4}  | workbook={5}" -f `
    $nm,$rec.recommendedRegressionType,$rec.recommendedWeightingMode,$rec.nonForcedZeroRegressionType,$rec.nonForcedZeroWeightingMode,$wb[$nm].model)
}

Write-Host "`n==================== EXECUTIVE (selected-model) vs WORKBOOK ====================" -ForegroundColor Cyan
foreach($e in $report.executive){
  $nm=$e.analyteName; if(-not $wb.ContainsKey($nm)){continue}
  Write-Host ("{0,-26} sel={1}/{2} status={3} r2={4} rf%rsd={5}" -f $nm,$e.selectedRegressionType,$e.selectedWeightingMode,$e.calStatus,([math]::Round($e.rSquared,6)),([math]::Round($e.responseFactorRsd,3)))
  if($e.failureReasons){ $e.failureReasons | ForEach-Object { Write-Host "      fail: $_" } }
  Write-Host ("      workbook expects: model={0} r2={1} rf%rsd={2} -> Acceptable" -f $wb[$nm].model,$wb[$nm].r2,$wb[$nm].rsd) -ForegroundColor DarkGray
}

Write-Host "`n==================== ICV ====================" -ForegroundColor Cyan
foreach($e in $report.executive){
  $nm=$e.analyteName; if(-not $wb.ContainsKey($nm)){continue}
  Write-Host ("{0,-26} icvPassed={1} icvCdsPassed={2} icvLcsRecoveryPassed={3}" -f $nm,$e.icvPassed,$e.icvCdsPassed,$e.icvLcsRecoveryPassed)
}

Write-Host "`n==================== READINESS BLOCKING BREAKDOWN ====================" -ForegroundColor Cyan
Write-Host ("isReady={0}  blocking={1}  warnings={2}" -f $ready.isReady,$ready.blockingIssues.Count,$ready.warnings.Count)
$byCode = $ready.blockingIssues | Group-Object { if($_.code){$_.code}elseif($_.issueType){$_.issueType}elseif($_.type){$_.type}else{'(no code)'} } | Sort-Object Count -Descending
Write-Host "-- blocking by code --"
$byCode | ForEach-Object { Write-Host ("  {0,-6} {1}" -f $_.Count,$_.Name) }
Write-Host "-- 3 sample blocking issues --"
$ready.blockingIssues | Select-Object -First 3 | ForEach-Object { ($_ | ConvertTo-Json -Compress -Depth 4) }
$focus = @('Bromomethane','Vinyl Chloride-C','Dichlorodifluoromethane')
$focusBlock = $ready.blockingIssues | Where-Object { $s=($_ | ConvertTo-Json -Compress -Depth 4); $focus | Where-Object { $s -match [regex]::Escape($_) } }
Write-Host ("-- blocking issues mentioning a focus analyte: {0}" -f $focusBlock.Count)
