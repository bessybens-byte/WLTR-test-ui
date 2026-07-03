# WLTR Test UI ↔ Excel Field Map

Reference workbook: **`230120_MS4_VOC_Preloaded (5) - Unlocked (2).xlsm`**

| Excel sheet | Role |
|-------------|------|
| **Data Visualization Deck (DVD)** | Regression engine, 9 models, Report Card, Point Total |
| **Cal Data** | Paste Agilent quantitation reports (CAL standards) |
| **ICV Data** | Paste ICV quantitation report |
| **Summary Report** | ICAL pass/fail tables (4 sections) |
| **Ref Table** | Method config + per-analyte ICAL criteria |
| **Report Writer** | Print layout of Summary Report (no extra logic) |

Row numbers below refer to **one analyte block** on DVD (structure repeats per compound). Preloaded example uses rows ~240–270 for regression math; Summary Report criteria are rows **6–14** on sheet **Summary Report**.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| **Same** | UI label matches Excel text (modulo spacing/case) |
| **Renamed** | Same concept, different UI wording |
| **Split** | One Excel concept split into multiple UI fields |
| **N/A** | No direct Excel cell — see *Why not in Excel* |

---

## 1. Configuration (Excel: **Ref Table** + **Summary Report** criteria block)

### `/method-configs` — global criteria form  
Component: `method-config-form-fields.tsx`

| UI label | API field | Excel location | Excel label | Name difference |
|----------|-----------|----------------|-------------|-----------------|
| Name | `name` | Ref Table Q14–Q15 | **Method** → `VOC by GC/MS (624/8260)` | **Renamed:** UI stores a short config name; Excel embeds full method title in Ref Table / Summary Report header. |
| Label mode (R² / r) | `labelMode` | Summary Report G11 | **Coefficient of Determiantion = r²** (or r) | **Renamed:** UI exposes display mode (`R²` vs `√R²` as r). Excel stores one numeric threshold; label mode chooses whether `minCorrelation` compares to r or r². |
| Quantitation mode (ISTD / ESTD) | `quantitationMode` | DVD rows 246+ formulas | Implicit ISTD (`Resp X/Resp IS`) | **Renamed:** Excel MS4 preload is ISTD-only. UI adds ESTD for methods without internal standard normalization. |
| Minimum correlation | `minCorrelation` | Summary Report G11 / J11 | **Coefficient of Determination = r²** (value `0.990025…`) | **Same concept.** Excel typo “Determiantion”. |
| Maximum RSE | `maxRSE` | Summary Report M10 / P10 | **RSE % Criteria** → `15` | **Same.** |
| Percent diff lower bound | `pctDiffLowBound` | Summary Report G12 / K13 | **ICAL % Diff Value (Curve Refitting)** low factor `0.8` | **Split:** Excel uses asymmetric multipliers (0.8 / 1.2 on ±20%). UI stores explicit lower % bound (e.g. −20). |
| Percent diff upper bound | `pctDiffHighBound` | Summary Report G12 / J13 | **ICAL % Diff Value** high factor `1.2` | **Split:** see above. |
| Minimum calibration points | `minPointsRequired` | Summary Report M12–O13 | **Minimum Number of Calibration Points** (LS `4`, Quad `5`, Quad model `6`) | **Split:** Excel has separate minima per model family; UI uses one global minimum for compute gating. |
| Maximum missed points | `maxMissedPoints` | Summary Report G14 / J14 | **Max # of allowable CAL PT failures** → `2` | **Renamed:** “missed points” = cal points failing %Diff. |
| ICV recovery limit (ICV %) | `icvLimitPercent` | Summary Report S11 / V11 | **ICV % Difference from True** → `20` | **Renamed:** UI “recovery limit”; Excel “% Difference from True”. Same ±% check when per-analyte LCL/UCL not set. |
| Target analyte RF limit (RF %RSD) | `rsdPercentLimit` | Summary Report G10 / J10 | **RSD % Criteria** → `15` | **Renamed:** UI clarifies this is target-analyte RF %RSD. |
| IS / surrogate RF limit | `isRsdPercentLimit` | Summary Report M14 / P14 | **ICAL Internal Standards / Surrogates (RSD%)** → `20` | **Renamed:** UI splits IS/surrogate limit from target limit; Excel groups under one row label. |
| ICV CDS parity limit | `icvCdsParityPercent` | Summary Report S10 / V10 | **ICV % Diff Value (Inst - Ext Calculator)** → `0.01` | **Renamed:** UI “CDS parity”; Excel “Instrument − External Calculator”. |
| Soil dilution factor | `soilDilutionFactor` | Summary Report S13 / V13; DVD B269 | **Soil Dilution Factor** → `50` | **Same.** Presentation-only in both. |
| Aqueous dilution factor | `aqueousDilutionFactor` | Summary Report S14 / V14; DVD B268 | **Aqueous Dilution Factor** → `1` | **Same.** |
| IS response minimum | `internalStandardResponseMin` | — | — | **N/A:** Optional WLTR run-quality warning. Excel does not store IS area bounds on Ref Table (only %RSD criterion). |
| IS response maximum | `internalStandardResponseMax` | — | — | **N/A:** same as above. |

### `/method-configs` — per-analyte criteria panel  
Component: `method-config-analyte-criteria-panel.tsx`  
Excel: Ref Table columns **U–AE** (Analyte Switch, SPCC, CCC, ICV limits, multipliers)

| UI label | API field | Excel location | Excel label | Name difference |
|----------|-----------|----------------|-------------|-----------------|
| Analyte | `analyteId` | Ref Table F18+ | **Compound** | **Renamed:** UI uses catalog analyte; Excel lists method compound names from preload. |
| System performance check (SPCC) | `isSpcc` | Ref Table (SPCC column) | **SPCC Check** | **Same.** |
| Min response factor | `minResponseFactor` | DVD AV243 area | **SPCC** minimum RF | **Renamed:** UI “min RF”; Excel “SPCC Check” block. |
| Continued calibration check (CCC) | `isCcc` | Ref Table | **CCC Check** | **Same.** |
| Max response-factor variation | `maxRsdPercent` | Ref Table CCC columns | **CCC Min RSD%** | **Renamed:** UI “RF %RSD”; Excel “CCC … Min RSD%”. |
| Method blank limit | `methodBlankLimit` | Ref Table (per-analyte MB) | **Method Blank** limit | **Same concept.** Not evaluated in Excel until blank runs exist; same in WLTR. |
| ICV/LCS spike concentration | `icvLcsConcentration` | DVD AU243 | **ICV Conct** | **Renamed:** UI “nominal conc.”; Excel “ICV Conct”. LCS and ICV share one verification path in WLTR. |
| ICV/LCS lower recovery limit (LCL) | `icvLcsLowerControlLimit` | DVD AV243 | **ICV % Rev Limits (LL)** | **Renamed:** UI “LCL”; Excel “Rev Limits (LL)”. |
| ICV/LCS upper recovery limit (UCL) | `icvLcsUpperControlLimit` | DVD AW243 | **ICV % Rev Limits (HL)** | **Renamed:** UI “UCL”; Excel “Rev Limits (HL)”. |
| Concentration multiplier | `concentrationMultiplier` | DVD AG232 | **Concentration Multiplier** | **Same.** |
| Surrogate spike amount | `surrogateSpikeAmount` | Ref Table surrogate block | Surrogate spiked amount | **Same concept.** |
| Surrogate recovery lower/upper | `surrogateRecoveryLowerLimit`, `surrogateRecoveryUpperLimit` | Ref Table / Summary surrogate section | Surrogate **% Rec** limits | **Renamed:** UI explicit LCL/UCL %; Excel “Surrogate Evaluation” pass/fail columns. |

### `/method-configs/[id]/snapshots`  
Read-only view of frozen Ref Table criteria at compute time — same field map as above.

---

## 2. Data ingestion (Excel: **Cal Data**, **ICV Data**)

### `/runs/upload`

| UI label | API field | Excel location | Excel label | Name difference |
|----------|-----------|----------------|-------------|-----------------|
| Run type: CAL / ICV | `runType` | Cal Data = CAL columns; ICV Data sample row | **Sample:** `VOC ICV1` vs cal vial IDs | **Renamed:** UI enum; Excel uses separate sheets/layouts. |
| Calibration level | `level` | Cal Data row 11 headers | **Initial Calibration Point 1…20** | **Renamed:** UI stores level in DB (`CalibrationLevel`); Excel horizontal blocks per point. |
| Instrument | `instrumentId` | Ref Table Q12; Summary C3 | **Instrument ID** → `GC/MS #4` | **Split:** UI instrument catalog entity; Excel free-text in Ref Table. |
| Run date | `runDate` | Report header Acq On | **Acq On** | **Renamed:** UI ISO datetime; Excel paste field. |
| Name (optional) | `name` | Cal Data D8 Misc / vial ID | **Misc** / **ALS Vial** | **Renamed:** UI optional friendly name. |
| Raw text | `rawText` | Cal/ICV **column A** (hidden) | Full Agilent **Quantitation Report** text | **Same.** Paste target is column A; MID/VALUE formulas parse visible columns. |

### `/runs/[id]` — run detail + measurements table

| UI column | API field | Excel location | Excel label | Name difference |
|-----------|-----------|----------------|-------------|-----------------|
| Compound | `rawCompoundName` | Cal/ICV col C | **Compound** | **Same.** |
| Category | `compoundCategory` | Section headers | **Internal Standards** / **Surrogates** / targets | **Renamed:** UI enum (Target, IS, Surrogate, SMC); Excel section layout. |
| Analyte | `canonicalAnalyteName` | — | — | **N/A:** WLTR catalog mapping. Excel has no canonical analyte layer — compound name is the key. |
| Response | `response` | Col H | **Response** | **Same.** |
| RT | `retentionTime` | Col F | **R.T.** | **Renamed:** UI “RT”; Excel “R.T.” |
| Quant ion | `quantIon` | Col G | **Q Ion** | **Renamed:** UI words out abbreviation. |
| Manual | `isManualIntegration` | — | — | **N/A:** Parsed from CDS if present; not a dedicated Excel column in preload layout. |
| Calc conc | `calculatedConcentration` | Col I | **Conc (ppb)** | **Renamed:** UI neutral “calc conc”; Excel matrix-specific ppb. |
| True conc | `trueConcentration` | From level / Ref Table | Known standard conc | **Split:** UI from `CalibrationLevel`; Excel implied by cal point column + Ref Table IS conc. |
| IS resp | `internalStandardResponse` | Derived | IS peak **Response** in IS rows | **Renamed:** UI paired IS area per target row; Excel shows IS blocks separately. |
| Ratio | `responseRatio` | DVD Y-axis | **Response ratio** (Y) | **Same concept** (ISTD). |
| Conc ratio | `concentrationRatio` | DVD row 240 | **Amount Ratio (X-Value)** | **Renamed:** WLTR/API uses “concentration ratio” in code comments; Excel **Amount Ratio**. |
| Conc ratio² | `concentrationRatioSquared` | DVD row 243 | **Inverse Amount Ratio (Squared X2)** helper | **Renamed:** UI shows X²; Excel uses in weighting rows. |
| RF | `responseFactor` | DVD row 241 | **Response Factor (Y * X)** | **Same.** |

### `/runs/[id]` — resolve mapping form

| UI label | API field | Excel | Why not in Excel |
|----------|-----------|-------|------------------|
| Raw compound name | `rawCompoundName` | Compound column | Same source text. |
| Canonical analyte | `analyteId` | — | **N/A:** Multi-lab alias resolution; Excel assumes fixed compound list on Ref Table. |
| Save as lab-wide alias | `saveAsAlias` | — | **N/A:** WLTR persistence for fuzzy CDS naming. |
| Apply to Run / Laboratory | `applyScope` | — | **N/A:** Scope of alias application. |

### `/runs/[id]` — IS summaries panel

| UI column | Excel | Why not in Excel |
|-----------|-------|------------------|
| Compound, Min, Max, Mean, %RSD, RSD limit, RSD pass, Count, Runs, Warn | Summary Report **Internal Standard Evaluation** (pass/fail) | **Partial:** Excel evaluates IS %RSD at report time; WLTR aggregates across runs/groups in UI. |

---

## 3. Calibration levels & internal standards

### `/calibration-levels`

| UI label | API field | Excel location | Excel label | Name difference |
|----------|-----------|----------------|-------------|-----------------|
| Level name | `levelName` | Cal Data row 11 | **Initial Calibration Point N** | **Renamed:** UI editable name; Excel fixed “Point 1…20” labels. |
| True concentration | `trueConcentration` | DVD row 6 (M6:Y6) | **Base Concentration** per Cal 1…13 | **Renamed:** UI central level table; Excel base conc on DVD + point columns. |
| Sort order | `sortOrder` | Cal column order left→right | Point 1, 2, 3… | **N/A:** UI ordering for lists; Excel physical column order. |

### `/internal-standards`

| UI label | API field | Excel location | Excel label | Name difference |
|----------|-----------|----------------|-------------|-----------------|
| Name / CAS | `name`, `casNumber` | Ref Table IS rows | **Compound** (Fluorobenzene, etc.) | **Split:** UI IS catalog; Excel embeds IS in Ref Table with conc. |
| Spike concentration | `concentration` | Ref Table X21–X23 | **Conc (ng)** / **Conc (ppb)** → `10` | **Renamed:** UI “spike concentration”; Excel per-IS conc on Ref Table. WLTR stores on IS entity because upload needs it without method context. |

### `/analytes`

| UI label | API field | Excel | Why not in Excel |
|----------|-----------|-------|------------------|
| Name, CAS, Role | `name`, `casNumber`, `role` | Ref Table compound list | **Partial:** Excel lists method compounds; no CAS/role columns in preload Ref Table. |
| Default internal standard | `defaultInternalStandardId` | Implicit in method | **N/A:** WLTR global IS assignment at upload; Excel method file defines IS pairing in CDS/Ref Table. |
| Aliases | `aliases[]` | — | **N/A:** CDS text → catalog mapping. |

### `/instruments` + suppressed analytes

| UI field | Excel | Why not in Excel |
|----------|-------|------------------|
| Instrument name, type, manufacturer, model, serial, notes, active | Ref Table Q12 **Instrument ID** only | **N/A:** WLTR multi-instrument lab admin. Excel assumes single instrument per workbook. |
| Suppressed analytes | Ref Table **Analyte Switch** Off=2 | **Renamed:** UI per-instrument suppression list; Excel **Analyte Switch** on Ref Table is the same intent at method level. |

---

## 4. Calibration groups (Excel: **DVD** + **Summary Report** workflow)

### `/calibration-groups` — create group

| UI label | API field | Excel | Why not in Excel |
|----------|-----------|-------|------------------|
| Group name | `name` | — | **N/A:** WLTR bundles runs + snapshot; Excel is one workbook per calibration event. |
| Instrument | `instrumentId` | Ref Table | See instruments. |
| Method configuration | `methodConfigId` | Ref Table entire sheet | **Renamed:** UI versioned config; Excel embeds criteria in workbook. |
| CAL runs (checkboxes) | `calRunIds[]` | Cal Data columns (points 1–13) | **Split:** UI links uploaded runs; Excel columns are paste areas. |
| ICV run | `icvRunId` | ICV Data sheet | **Same data source**, different container. |

### Group overview card

| UI label | API field | Excel | Why not in Excel |
|----------|-----------|-------|------------------|
| Status (Draft/Computed/Approved/Rejected) | `status` | — | **N/A:** WLTR workflow states; Excel has no approval gate. |
| Computation stale | `isComputationStale` | — | **N/A:** WLTR detects config/run changes post-compute. |
| Computation version | `computationVersion` | — | **N/A:** Audit/reproducibility in DB. |
| Method config snapshot | `methodConfigSnapshotId` | Frozen Ref Table at compute | **Same intent:** snapshot = criteria in force at compute. |
| Snapshot frozen at compute | `computedAt` | — | **Partial:** Excel is static file; no timestamp field. |

### Setup tab — target / excluded analytes

| UI label | Excel | Why not in Excel |
|----------|-------|------------------|
| Target analytes list | Ref Table compounds with Switch=1 | **Partial:** derived from measurements in WLTR. |
| Excluded analytes | **Analyte Switch** Off=2 + DVD exclusions | **Split:** WLTR group-level exclusion list; Excel switch on Ref Table + **Calibration Point Deleter** on DVD. |

---

## 5. Compute & model (Excel: **DVD**)

### Report card — `calibration-group-workflow-panel.tsx`

| UI column / control | Excel location | Excel label | Name difference |
|---------------------|----------------|-------------|-----------------|
| Report card — model comparison | DVD FF247 area | **Low level Extrapolation Data and ICV Ranking to determine the Report Card** | **Renamed:** UI “Report card”. |
| Best overall ranked (suggested) | DVD BB264 / BH264 | **Best overall ranked calibration model:** | **Same.** |
| Best ranked non-forced 0 | DVD BB265 / BH265 | **Best ranked non-forced 0 calibration model:** | **Same.** |
| Analyte | DVD analyte block header | **Compound** | **Renamed.** |
| R² | DVD AS245 / model rows | **COD (r²)** | **Renamed:** UI always shows R² column. |
| Cal | Primary criteria pass gate | Curve refitting / %Diff criteria | **Renamed:** shorthand pass flag. |
| ICV | ICV ranking + pass | **ICV Evaluation** | **Same.** |
| Missed pts | DVD BF:BP failure counts | Missed cal points in %Diff bounds | **Renamed.** |
| Model | Rows 246–262 labels | e.g. **Average RF**, **LS (EW)**, **Quad (Forced 0)** | **Renamed:** UI uses `REGRESSION_TYPE_LABEL` + weighting. |
| Point Total (in API/debug, not always shown in table) | DVD BI:BP composite | **Point Total** | **Same.** Hidden in main table; visible in QA debug. |
| Select model / Approve / Reject | Manual QA choice on DVD | Analyst picks model row; Excel does not lock workbook | **N/A:** WLTR approval workflow + permissions. |

### Model variant labels (UI → Excel DVD rows)

| UI label (`REGRESSION_TYPE_LABEL` + weighting) | Excel DVD row | Excel label |
|-----------------------------------------------|---------------|-------------|
| Average / None | 246–247 | **Average RF** |
| Linear / None | 248–249 | **Least Squared Regression** / **Equal Weighting** |
| Linear / 1/x | 250–251 | **Inverse Conct** / **Inverse Concentration Weighting** |
| Linear / 1/x² | 252–253 | **Inverse Sq Conct** / **Inverse Concentration Squared Weighting** |
| Linear (forced zero) / None | 254–255 | **Least Squared (forced 0)** / **LS(Forced 0)** |
| Quadratic / None | 256–257 | **Quadratric Regression** / **Equal weighting** |
| Quadratic / 1/x | 258–259 | **Quad (Inv Conct)** |
| Quadratic / 1/x² | 260–261 | **Quad (Inv Sqd)** |
| Quadratic (forced zero) / None | 262–263 | **Quad (Forced 0)** |

### Regression inputs table — `calibration-group-regression-inputs-panel.tsx`

| UI column | Excel DVD row / label | Name difference |
|-----------|----------------------|-----------------|
| Level | Cal point name | **Initial Calibration Point N** vs UI `levelName` |
| True conc | Standard concentration | **Same.** |
| Amount ratio (X) | Row 240 | **Amount Ratio (X-Value)** — UI uses API term “amount ratio”. |
| Std response | Measurement | **Standard Response** |
| IS response | IS row Response | **Internal Standard Response** |
| Response ratio (Y) | Y-axis | **Response ratio** |
| 1/X | Row 242 | **Inverse Amount Ratio (1/X-Value)** |
| 1/X² | Row 243 | **Inverse Amount Ratio (Squared X2)** |
| Weight | Weighting rows | **Equal Weighting Factor**, W=1/X, etc. |
| ŷ pred | Predicted Y | **Calculated Response Ratio** (row 244) for Average RF anchor |
| Residual | Stats block | Regression residual |
| % diff | Row 247+ | **Percent Difference From "True"** |
| RF | Row 241 | **Response Factor (Y * X)** |
| Calc conc | Back-calc column | **Calc Conct** / variant rows 246+ |
| In | Point included in fit | Excel point deleter / switch |
| Exclusion | Manual exclude | **Calibration Point Deleter** |
| Run / Run name | — | **N/A:** WLTR traces which uploaded run supplied the point. |
| Manual | — | **N/A:** CDS integration flag. |
| Note | — | **N/A:** WLTR audit note on exclusion. |

### Variant comparison (QA debug) — mirrors DVD columns 246–262

See `VariantComparisonDto` in backend — each column pair maps to DVD **Calc conc** + **%Diff** rows 246–263.

### Low-level extrapolation probes (QA debug)

| UI / API | Excel DVD rows EY–FF | Excel label |
|----------|---------------------|-------------|
| Probe ladder 0, 12.5%, 25%, 50%, 75% | EZ–FC | **0 area**, **0.125% Cal 2**, etc. |
| Negative area ranking | FE247 | **Negative Area Ranking** |
| ICV ranking | FF247 | **ICV Ranking** |
| Overall extrapolation ranking | GP columns | **Overall extrapolation ranking** |

---

## 6. Summary Report (Excel: **Summary Report** sheet)

UI: `calibration-group-summary-report-panel.tsx` — maps 1:1 to Excel four tables.

### 1. Administrative summary

| UI label | Excel Summary Report | Name difference |
|----------|---------------------|-----------------|
| Method config name | C4 **Method** | **Renamed.** |
| Computed at | Y3 **Date** | **N/A:** WLTR timestamp; Excel manual date cell. |
| Computation version | — | **N/A:** DB-only. |
| Target %RSD limit | G10 | **RSD % Criteria** |
| IS/surrogate %RSD limit | M14 | **ICAL Internal Standards / Surrogates (RSD%)** |
| ICV vs true limit (%) | S11 | **ICV % Difference from True** |
| ICV CDS parity (%) | S10 | **ICV % Diff Value (Inst - Ext Calculator)** |
| Soil / Aqueous dilution factor | S13 / S14 | **Same.** |
| Computation stale | — | **N/A:** WLTR only. |

### 2. Executive summary (per-analyte table)

| UI column | Excel Summary Report section | Excel label |
|-----------|------------------------------|-------------|
| Analyte | Per-analyte rows | **Compound** |
| Status | Pass/Fail column | **Cal Status** / evaluation result |
| R² | Executive block | **COD (r²)** |
| r | Executive block | **Correlation Coefficient = r** |
| RSE | Executive block | **RSE %** |
| RF mean | RF summary | **Average RF** |
| RF %RSD | RF summary | **RSD %** |
| ICV | S8 ICV section | **ICV Evaluation** pass |
| ICV CDS | Y8 External calculator | **ICV % Diff (Inst - Ext Calculator)** |
| ICV/LCS | Per-analyte LCL/UCL | **ICV % Rev Limits** recovery |
| SPCC RF | SPCC check | **SPCC** min RF |
| CCC RSD | CCC check | **CCC Min RSD%** |
| Failure reasons (subtext) | — | **N/A:** WLTR enumerates failure strings; Excel shows pass/fail only. |

### 3. Response factor summary

| UI column | Excel | Name difference |
|-----------|-------|-----------------|
| Analyte | **Initial Calibration Response Factor (RF) Summary Table** | **Same section.** |
| Mean RF / %RSD | Table header stats | **Average RF** / **RSD %** |
| X, Y, RF, Included | Per-level rows | **Amount Ratio**, **Response Ratio**, **RF**, point inclusion |

### 4. Linear dynamic range

| UI column | Excel | Name difference |
|-----------|-------|-----------------|
| slope, intercept | LDR header | **Linear Slope** / **Linear Intercept** |
| ICV true, calc, %Diff, CDS %Diff | LDR ICV block | **ICV Conct**, calculated, **ICV % Difference from True**, **ICV % Diff (Inst - Ext Calculator)** |
| X, Y, Predicted Y, Residual, %Diff, Incl., Accept | Per-point LDR | Same math columns as DVD selected model |

---

## 7. Pages with no Excel equivalent

These WLTR Test UI areas support **multi-user lab software** and have no corresponding sheet in the chromatography workbook.

| Route / area | Why not in Excel |
|--------------|------------------|
| `/login`, `/forgot-password`, `/reset-password`, `/accept-invite` | Identity/auth — not part of calibration math. |
| `/dashboard`, `/account`, `/technicians/*`, `/users/*`, `/roles/*`, `/invitations/*` | User & lab administration. |
| `/laboratories/*` | Multi-laboratory tenancy. |
| `/analytes/tools` (unresolved compounds, fuzzy match) | CDS alias resolution tooling. |
| `/api-docs`, `/developer` | API exploration. |
| Calibration group **Approve / Reject** + QA comment | Workflow + audit; Excel has no status machine. |
| **Computation stale** flags | Detects post-compute config edits. |
| **Method config snapshots** (version list) | Version history; Excel is a single frozen file copy. |
| **Readiness panel** checks | Pre-compute validation aggregator. |
| Run **validation issues** (severity, code, message) | Upload parser diagnostics. |
| **Pagination**, **permissions**, **lab picker** (platform) | Web app infrastructure. |
| Plotly calibration charts | DVD has ~358 embedded Excel charts; WLTR renders interactive plots from API data. |

---

## 8. Quick sheet lookup

| If the UI shows… | Look in Excel… |
|------------------|----------------|
| Paste quant report | **Cal Data** or **ICV Data** column A |
| Method limits & compound switches | **Ref Table** |
| Nine models & Point Total | **DVD** rows 246–267 |
| ICAL pass/fail report | **Summary Report** |
| Printable layout | **Report Writer** (formatting only) |
| Quadratic matrix math | External **`Quadratic Regression Program.xls`** (linked; not in Test UI) |

---

*Generated from analysis of `230120_MS4_VOC_Preloaded (5) - Unlocked (2).xlsm` and WLTR-test-ui source. Row numbers refer to the preloaded DVD analyte block; other analyte blocks repeat the same row pattern at different offsets.*
