/**
 * Excel workbook cross-reference for WLTR Test UI (development / QA).
 * Workbook: 230120_MS4_VOC_Preloaded (5) - Unlocked (2).xlsm
 * Full map: docs/EXCEL_UI_FIELD_MAP.md
 */

export type ExcelMatchStatus = "same" | "renamed" | "split" | "partial" | "na";

export type ExcelFieldAnnotation = {
  sheet?: string;
  location?: string;
  excelLabel?: string;
  note?: string;
  status?: ExcelMatchStatus;
};

export type ExcelPageGuide = {
  title: string;
  sheets: string[];
  description: string;
  lookupHint?: string;
};

export const EXCEL_WORKBOOK = "230120_MS4_VOC_Preloaded (5) - Unlocked (2).xlsm";

export const EXCEL_FIELD: Record<string, ExcelFieldAnnotation> = {
  // —— Method config (Ref Table + Summary Report criteria) ——
  "methodConfig.name": {
    sheet: "Ref Table",
    location: "Q14–Q15",
    excelLabel: "Method",
    status: "renamed",
    note: "Excel embeds full method title; UI stores a short config name.",
  },
  "methodConfig.labelMode": {
    sheet: "Summary Report",
    location: "G11",
    excelLabel: "Coefficient of Determiantion = r² (or r)",
    status: "renamed",
    note: "UI chooses whether minCorrelation compares to r or r².",
  },
  "methodConfig.quantitationMode": {
    sheet: "DVD",
    location: "rows 246+",
    excelLabel: "Resp X / Resp IS (ISTD)",
    status: "renamed",
    note: "Preload is ISTD-only; UI adds ESTD for methods without IS normalization.",
  },
  "methodConfig.minCorrelation": {
    sheet: "Summary Report",
    location: "G11 / J11",
    excelLabel: "Coefficient of Determination = r²",
    status: "same",
    note: "Excel typo “Determiantion”. Value e.g. 0.990025.",
  },
  "methodConfig.maxRSE": {
    sheet: "Summary Report",
    location: "M10 / P10",
    excelLabel: "RSE % Criteria",
    status: "same",
  },
  "methodConfig.pctDiffLowBound": {
    sheet: "Summary Report",
    location: "G12 / K13",
    excelLabel: "ICAL % Diff Value (Curve Refitting) low 0.8",
    status: "split",
    note: "Excel uses multiplier 0.8 on ±20%; UI stores explicit lower % (e.g. −20).",
  },
  "methodConfig.pctDiffHighBound": {
    sheet: "Summary Report",
    location: "G12 / J13",
    excelLabel: "ICAL % Diff Value high 1.2",
    status: "split",
    note: "Excel uses multiplier 1.2; UI stores explicit upper % (e.g. +20).",
  },
  "methodConfig.minPointsRequired": {
    sheet: "Summary Report",
    location: "M12–O13",
    excelLabel: "Minimum Number of Calibration Points",
    status: "split",
    note: "Excel: separate minima for LS (4), Quad (5), Quad model (6); UI one global minimum.",
  },
  "methodConfig.maxMissedPoints": {
    sheet: "Summary Report",
    location: "G14 / J14",
    excelLabel: "Max # of allowable CAL PT failures",
    status: "renamed",
    note: "Missed cal points failing %Diff bounds.",
  },
  "methodConfig.icvLimitPercent": {
    sheet: "Summary Report",
    location: "S11 / V11",
    excelLabel: "ICV % Difference from True",
    status: "renamed",
    note: "Default ±% when per-analyte LCL/UCL not set.",
  },
  "methodConfig.rsdPercentLimit": {
    sheet: "Summary Report",
    location: "G10 / J10",
    excelLabel: "RSD % Criteria",
    status: "renamed",
    note: "Target-analyte RF %RSD limit.",
  },
  "methodConfig.isRsdPercentLimit": {
    sheet: "Summary Report",
    location: "M14 / P14",
    excelLabel: "ICAL Internal Standards / Surrogates (RSD%)",
    status: "renamed",
  },
  "methodConfig.icvCdsParityPercent": {
    sheet: "Summary Report",
    location: "S10 / V10",
    excelLabel: "ICV % Diff Value (Inst - Ext Calculator)",
    status: "renamed",
    note: "Instrument vs external calculator parity (0.01% in preload).",
  },
  "methodConfig.soilDilutionFactor": {
    sheet: "Summary Report / DVD",
    location: "S13 / V13; B269",
    excelLabel: "Soil Dilution Factor",
    status: "same",
  },
  "methodConfig.aqueousDilutionFactor": {
    sheet: "Summary Report / DVD",
    location: "S14 / V14; B268",
    excelLabel: "Aqueous Dilution Factor",
    status: "same",
  },
  "methodConfig.internalStandardResponseMin": {
    status: "na",
    note: "WLTR run-quality warning only — Excel has no IS area bounds on Ref Table.",
  },
  "methodConfig.internalStandardResponseMax": {
    status: "na",
    note: "WLTR run-quality warning only — Excel has no IS area bounds (only IS %RSD at Summary Report M14).",
  },

  // —— Per-analyte criteria (Ref Table U–AE) ——
  "analyteCriteria.analyte": {
    sheet: "Ref Table",
    location: "F18+",
    excelLabel: "Compound",
    status: "renamed",
    note: "UI uses catalog analyte ID; Excel lists method compound names.",
  },
  "analyteCriteria.isSpcc": {
    sheet: "Ref Table",
    excelLabel: "SPCC Check",
    status: "same",
  },
  "analyteCriteria.minResponseFactor": {
    sheet: "DVD",
    location: "AV243",
    excelLabel: "SPCC minimum RF",
    status: "renamed",
    note: "Per-analyte SPCC Check block on DVD (preload analyte row).",
  },
  "analyteCriteria.isCcc": {
    sheet: "Ref Table",
    excelLabel: "CCC Check",
    status: "same",
  },
  "analyteCriteria.maxRsdPercent": {
    sheet: "Ref Table",
    excelLabel: "CCC Min RSD%",
    status: "renamed",
    note: "UI “RF %RSD”; Excel CCC Min RSD%.",
  },
  "analyteCriteria.methodBlankLimit": {
    sheet: "Ref Table",
    excelLabel: "Method Blank limit",
    status: "same",
    note: "Not evaluated in Excel until blank runs exist; same in WLTR.",
  },
  "analyteCriteria.icvLcsConcentration": {
    sheet: "DVD",
    location: "AU243",
    excelLabel: "ICV Conct",
    status: "renamed",
    note: "LCS and ICV share one verification path in WLTR.",
  },
  "analyteCriteria.icvLcsLowerControlLimit": {
    sheet: "DVD",
    location: "AV243",
    excelLabel: "ICV % Rev Limits (LL)",
    status: "renamed",
    note: "Overrides global ICV % when set; preload DVD row region.",
  },
  "analyteCriteria.icvLcsUpperControlLimit": {
    sheet: "DVD",
    location: "AW243",
    excelLabel: "ICV % Rev Limits (HL)",
    status: "renamed",
  },
  "analyteCriteria.concentrationMultiplier": {
    sheet: "DVD",
    location: "AG232",
    excelLabel: "Concentration Multiplier",
    status: "same",
  },
  "analyteCriteria.surrogateSpikeAmount": {
    sheet: "Ref Table",
    excelLabel: "Surrogate spiked amount",
    status: "same",
  },
  "analyteCriteria.surrogateRecoveryLowerLimit": {
    sheet: "Ref Table / Summary",
    excelLabel: "Surrogate % Rec lower",
    status: "renamed",
  },
  "analyteCriteria.surrogateRecoveryUpperLimit": {
    sheet: "Ref Table / Summary",
    excelLabel: "Surrogate % Rec upper",
    status: "renamed",
  },

  // —— Run upload (Cal Data / ICV Data) ——
  "run.runType": {
    sheet: "Cal Data / ICV Data",
    excelLabel: "CAL columns vs ICV sample VOC ICV1",
    status: "renamed",
    note: "Excel uses separate sheet layouts; UI enum CAL / ICV.",
  },
  "run.level": {
    sheet: "Cal Data",
    location: "row 11",
    excelLabel: "Initial Calibration Point 1…20",
    status: "renamed",
  },
  "run.instrumentId": {
    sheet: "Ref Table / Summary",
    location: "Q12; C3",
    excelLabel: "Instrument ID → GC/MS #4",
    status: "split",
    note: "UI instrument catalog entity; Excel free-text.",
  },
  "run.runDate": {
    sheet: "Report header",
    excelLabel: "Acq On",
    status: "renamed",
  },
  "run.name": {
    sheet: "Cal Data",
    location: "D8",
    excelLabel: "Misc / ALS Vial",
    status: "renamed",
  },
  "run.rawText": {
    sheet: "Cal Data / ICV Data",
    location: "column A (hidden)",
    excelLabel: "Full Agilent Quantitation Report",
    status: "same",
    note: "MID/VALUE formulas parse visible columns from paste in A.",
  },
  "run.resolve.rawCompoundName": {
    sheet: "Cal / ICV",
    location: "col C",
    excelLabel: "Compound",
    status: "same",
    note: "Same CDS text; WLTR adds alias resolution layer.",
  },
  "run.resolve.analyteId": {
    status: "na",
    note: "Canonical analyte mapping — Excel assumes fixed Ref Table compound list.",
  },
  "run.resolve.saveAsAlias": {
    status: "na",
    note: "Lab-wide alias for fuzzy CDS naming on future runs.",
  },
  "run.resolve.applyScope": {
    status: "na",
    note: "One-off mapping scope: this run vs entire laboratory.",
  },
  "run.validationIssues": {
    status: "na",
    note: "Upload parser diagnostics — no equivalent list in Excel workbook.",
  },

  // —— Run measurements ——
  "measurement.rawCompoundName": {
    sheet: "Cal / ICV",
    location: "col C",
    excelLabel: "Compound",
    status: "same",
  },
  "measurement.compoundCategory": {
    sheet: "Cal / ICV",
    excelLabel: "Internal Standards / Surrogates / targets",
    status: "renamed",
    note: "UI enum Target, IS, Surrogate, SMC.",
  },
  "measurement.canonicalAnalyteName": {
    status: "na",
    note: "WLTR catalog mapping — Excel uses compound name as key.",
  },
  "measurement.response": {
    sheet: "Cal / ICV",
    location: "col H",
    excelLabel: "Response",
    status: "same",
  },
  "measurement.retentionTime": {
    sheet: "Cal / ICV",
    location: "col F",
    excelLabel: "R.T.",
    status: "renamed",
  },
  "measurement.quantIon": {
    sheet: "Cal / ICV",
    location: "col G",
    excelLabel: "Q Ion",
    status: "renamed",
  },
  "measurement.isManualIntegration": {
    status: "na",
    note: "Parsed from CDS if present; no dedicated Excel column in preload.",
  },
  "measurement.calculatedConcentration": {
    sheet: "Cal / ICV",
    location: "col I",
    excelLabel: "Conc (ppb)",
    status: "renamed",
  },
  "measurement.trueConcentration": {
    sheet: "DVD / Cal level",
    location: "row 6",
    excelLabel: "Base Concentration",
    status: "split",
    note: "UI from CalibrationLevel; Excel from cal point column + Ref Table.",
  },
  "measurement.internalStandardResponse": {
    sheet: "DVD",
    excelLabel: "Internal Standard Response",
    status: "renamed",
    note: "Paired IS area per target row; Excel shows IS blocks separately.",
  },
  "measurement.responseRatio": {
    sheet: "DVD",
    excelLabel: "Response ratio (Y)",
    status: "same",
  },
  "measurement.concentrationRatio": {
    sheet: "DVD",
    location: "row 240",
    excelLabel: "Amount Ratio (X-Value)",
    status: "renamed",
    note: "API “concentration ratio”; Excel Amount Ratio.",
  },
  "measurement.concentrationRatioSquared": {
    sheet: "DVD",
    location: "row 243",
    excelLabel: "Inverse Amount Ratio (Squared X2)",
    status: "renamed",
    note: "UI shows X²; Excel row 243 is inverse-squared weighting helper.",
  },
  "measurement.responseFactor": {
    sheet: "DVD",
    location: "row 241",
    excelLabel: "Response Factor (Y * X)",
    status: "same",
  },

  // —— Calibration levels ——
  "calLevel.levelName": {
    sheet: "Cal Data",
    location: "row 11",
    excelLabel: "Initial Calibration Point N",
    status: "renamed",
  },
  "calLevel.trueConcentration": {
    sheet: "DVD",
    location: "M6:Y6",
    excelLabel: "Base Concentration",
    status: "renamed",
  },
  "calLevel.sortOrder": {
    status: "na",
    note: "UI list ordering; Excel uses physical column order left→right.",
  },

  // —— Internal standards ——
  "internalStandard.name": {
    sheet: "Ref Table",
    excelLabel: "Compound (Fluorobenzene, etc.)",
    status: "split",
  },
  "internalStandard.concentration": {
    sheet: "Ref Table",
    location: "X21–X23",
    excelLabel: "Conc (ng) / Conc (ppb)",
    status: "renamed",
    note: "WLTR stores on IS entity for upload without method context.",
  },

  // —— Calibration group ——
  "group.name": {
    status: "na",
    note: "WLTR bundles runs + snapshot; Excel is one workbook per calibration event.",
  },
  "group.instrumentId": {
    sheet: "Ref Table",
    location: "Q12",
    excelLabel: "Instrument ID",
    status: "partial",
  },
  "group.methodConfigId": {
    sheet: "Ref Table",
    excelLabel: "Entire criteria sheet",
    status: "renamed",
    note: "UI versioned config; Excel embeds criteria in workbook.",
  },
  "group.calRunIds": {
    sheet: "Cal Data",
    excelLabel: "Columns Initial Calibration Point 1–13",
    status: "split",
    note: "UI links uploaded runs; Excel columns are paste areas.",
  },
  "group.icvRunId": {
    sheet: "ICV Data",
    excelLabel: "ICV quantitation paste",
    status: "same",
  },
  "group.status": {
    status: "na",
    note: "WLTR Draft/Computed/Approved/Rejected — Excel has no approval gate.",
  },
  "group.computationStale": {
    status: "na",
    note: "WLTR detects post-compute config/run changes.",
  },
  "group.computationVersion": {
    status: "na",
    note: "DB audit/reproducibility only.",
  },
  "group.methodConfigSnapshotId": {
    sheet: "Ref Table",
    excelLabel: "Frozen criteria at compute",
    status: "partial",
  },
  "group.computedAt": {
    status: "partial",
    note: "Excel is static file; Summary Report Y3 Date is manual.",
  },
  "group.targetAnalytes": {
    sheet: "Ref Table",
    excelLabel: "Analyte Switch = 1",
    status: "partial",
  },
  "group.excludedAnalytes": {
    sheet: "Ref Table / DVD",
    excelLabel: "Analyte Switch Off + Calibration Point Deleter",
    status: "split",
  },

  // —— Report card (DVD) ——
  "reportCard.title": {
    sheet: "DVD",
    location: "FF247",
    excelLabel: "Low level Extrapolation Data and ICV Ranking… Report Card",
    status: "renamed",
  },
  "reportCard.suggestedModel": {
    sheet: "DVD",
    location: "BB264 / BH264",
    excelLabel: "Best overall ranked calibration model",
    status: "same",
  },
  "reportCard.suggestedNonForcedZero": {
    sheet: "DVD",
    location: "BB265 / BH265",
    excelLabel: "Best ranked non-forced 0 calibration model",
    status: "same",
  },
  "reportCard.analyte": {
    sheet: "DVD",
    excelLabel: "Compound",
    status: "renamed",
  },
  "reportCard.rSquared": {
    sheet: "DVD",
    location: "AS245",
    excelLabel: "COD (r²)",
    status: "renamed",
  },
  "reportCard.calStatus": {
    sheet: "DVD / Summary",
    excelLabel: "Curve refitting / %Diff criteria",
    status: "renamed",
  },
  "reportCard.icvPassed": {
    sheet: "Summary / DVD",
    excelLabel: "ICV Evaluation",
    status: "same",
  },
  "reportCard.missedPointCount": {
    sheet: "DVD",
    location: "BF:BP",
    excelLabel: "Missed cal points in %Diff bounds",
    status: "renamed",
  },
  "reportCard.modelVariant": {
    sheet: "DVD",
    location: "rows 246–262",
    excelLabel: "Average RF, LS (EW), Quad (Forced 0), …",
    status: "renamed",
  },
  "reportCard.pointTotal": {
    sheet: "DVD",
    location: "BI:BP",
    excelLabel: "Point Total",
    status: "same",
    note: "Visible in QA debug; ranks models on DVD.",
  },
  "reportCard.selectModel": {
    status: "na",
    note: "WLTR approval workflow + permissions; Excel analyst picks row manually.",
  },
  "reportCard.reportCardScore": {
    sheet: "DVD",
    location: "BI:BP",
    excelLabel: "Point Total / pass-count ranking",
    status: "partial",
    note: "UI “Score” is pass-count; full Point Total composite is in QA debug JSON.",
  },
  "workflow.approveReject": {
    status: "na",
    note: "WLTR QA workflow — Excel has no Draft/Approved/Rejected gate.",
  },
  "workflow.qaComment": {
    status: "na",
    note: "Audit comment stored in WLTR only.",
  },
  "debug.variantComparison": {
    sheet: "DVD",
    location: "rows 246–263",
    excelLabel: "Calc conc + %Diff per model",
    status: "same",
    note: "VariantComparisonDto mirrors all nine DVD model rows.",
  },
  "debug.extrapolationProbes": {
    sheet: "DVD",
    location: "EY–FF247",
    excelLabel: "Extrapolation probe ladder, Negative Area Ranking, ICV Ranking",
    status: "same",
  },
  "debug.pointTotal": {
    sheet: "DVD",
    location: "BI:BP",
    excelLabel: "Point Total",
    status: "same",
  },
  "debug.externalQuadratic": {
    sheet: "External link",
    excelLabel: "Quadratic Regression Program.xls",
    status: "partial",
    note: "Linked from \\WINDOWS\\TEMP\\ in preload — not in Test UI.",
  },

  // —— Regression inputs (DVD) ——
  "regression.level": {
    sheet: "Cal Data",
    excelLabel: "Initial Calibration Point N",
    status: "renamed",
  },
  "regression.trueConc": {
    sheet: "DVD",
    excelLabel: "Standard concentration",
    status: "same",
  },
  "regression.amountRatio": {
    sheet: "DVD",
    location: "row 240",
    excelLabel: "Amount Ratio (X-Value)",
    status: "same",
  },
  "regression.stdResponse": {
    sheet: "DVD",
    excelLabel: "Standard Response",
    status: "same",
  },
  "regression.isResponse": {
    sheet: "DVD",
    excelLabel: "Internal Standard Response",
    status: "same",
  },
  "regression.responseRatio": {
    sheet: "DVD",
    excelLabel: "Response ratio (Y)",
    status: "same",
  },
  "regression.inverseX": {
    sheet: "DVD",
    location: "row 242",
    excelLabel: "Inverse Amount Ratio (1/X-Value)",
    status: "same",
  },
  "regression.inverseXSquared": {
    sheet: "DVD",
    location: "row 243",
    excelLabel: "Inverse Amount Ratio (Squared X2)",
    status: "same",
  },
  "regression.weight": {
    sheet: "DVD",
    excelLabel: "Equal Weighting Factor, W=1/X, W=1/X²",
    status: "same",
  },
  "regression.predictedY": {
    sheet: "DVD",
    location: "row 244",
    excelLabel: "Calculated Response Ratio",
    status: "same",
  },
  "regression.residual": {
    sheet: "DVD",
    excelLabel: "Regression residual",
    status: "same",
  },
  "regression.pctDiff": {
    sheet: "DVD",
    location: "row 247+",
    excelLabel: 'Percent Difference From "True"',
    status: "same",
  },
  "regression.rf": {
    sheet: "DVD",
    location: "row 241",
    excelLabel: "Response Factor (Y * X)",
    status: "same",
  },
  "regression.calcConc": {
    sheet: "DVD",
    location: "rows 246+",
    excelLabel: "Calc Conct",
    status: "same",
  },
  "regression.included": {
    sheet: "DVD",
    excelLabel: "Point included in fit",
    status: "same",
  },
  "regression.exclusion": {
    sheet: "DVD",
    excelLabel: "Calibration Point Deleter",
    status: "renamed",
    note: "WLTR adds run trace + audit note.",
  },
  "regression.sourceRun": {
    status: "na",
    note: "WLTR traces which uploaded run supplied the point.",
  },
  "regression.runName": {
    status: "na",
    note: "Friendly run label — Excel has cal point columns only, no run entity.",
  },
  "regression.manual": {
    status: "na",
    note: "CDS manual integration flag.",
  },
  "regression.note": {
    status: "na",
    note: "WLTR audit note on exclusion.",
  },

  // —— Compute ——
  "compute.runRegression": {
    sheet: "DVD",
    excelLabel: "Nine regression variants rows 246–262",
    status: "partial",
    note: "Excel recalculates on paste; WLTR explicit compute API.",
  },

  // —— Summary report ——
  "summary.admin.methodConfigName": {
    sheet: "Summary Report",
    location: "C4",
    excelLabel: "Method",
    status: "renamed",
  },
  "summary.admin.computedAt": {
    sheet: "Summary Report",
    location: "Y3",
    excelLabel: "Date",
    status: "partial",
  },
  "summary.admin.computationVersion": {
    status: "na",
    note: "DB-only.",
  },
  "summary.admin.rsdPercentLimit": {
    sheet: "Summary Report",
    location: "G10",
    excelLabel: "RSD % Criteria",
    status: "same",
  },
  "summary.admin.isRsdPercentLimit": {
    sheet: "Summary Report",
    location: "M14",
    excelLabel: "ICAL Internal Standards / Surrogates (RSD%)",
    status: "same",
  },
  "summary.admin.icvLimitPercent": {
    sheet: "Summary Report",
    location: "S11",
    excelLabel: "ICV % Difference from True",
    status: "same",
  },
  "summary.admin.icvCdsParityPercent": {
    sheet: "Summary Report",
    location: "S10",
    excelLabel: "ICV % Diff Value (Inst - Ext Calculator)",
    status: "same",
  },
  "summary.admin.soilDilutionFactor": {
    sheet: "Summary Report",
    location: "S13",
    excelLabel: "Soil Dilution Factor",
    status: "same",
  },
  "summary.admin.aqueousDilutionFactor": {
    sheet: "Summary Report",
    location: "S14",
    excelLabel: "Aqueous Dilution Factor",
    status: "same",
  },
  "summary.admin.computationStale": {
    status: "na",
    note: "WLTR only.",
  },
  "summary.executive.analyte": {
    sheet: "Summary Report",
    excelLabel: "Compound",
    status: "same",
  },
  "summary.executive.status": {
    sheet: "Summary Report",
    excelLabel: "Cal Status / evaluation result",
    status: "same",
  },
  "summary.executive.rSquared": {
    sheet: "Summary Report",
    excelLabel: "COD (r²)",
    status: "same",
  },
  "summary.executive.correlationR": {
    sheet: "Summary Report",
    excelLabel: "Correlation Coefficient = r",
    status: "same",
  },
  "summary.executive.rse": {
    sheet: "Summary Report",
    excelLabel: "RSE %",
    status: "same",
  },
  "summary.executive.meanResponseFactor": {
    sheet: "Summary Report",
    excelLabel: "Average RF",
    status: "same",
  },
  "summary.executive.responseFactorRsd": {
    sheet: "Summary Report",
    excelLabel: "RSD %",
    status: "same",
  },
  "summary.executive.icvPassed": {
    sheet: "Summary Report",
    location: "S8",
    excelLabel: "ICV Evaluation",
    status: "same",
  },
  "summary.executive.icvCdsPassed": {
    sheet: "Summary Report",
    location: "Y8",
    excelLabel: "ICV % Diff (Inst - Ext Calculator)",
    status: "same",
  },
  "summary.executive.icvLcsRecoveryPassed": {
    sheet: "Summary Report",
    excelLabel: "ICV % Rev Limits recovery",
    status: "same",
  },
  "summary.executive.spccMinRfPassed": {
    sheet: "Summary Report",
    excelLabel: "SPCC min RF",
    status: "same",
  },
  "summary.executive.cccRsdPassed": {
    sheet: "Summary Report",
    excelLabel: "CCC Min RSD%",
    status: "same",
  },
  "summary.executive.failureReasons": {
    status: "na",
    note: "WLTR enumerates failure strings; Excel pass/fail only.",
  },
  "summary.rf.x": {
    sheet: "Summary Report",
    excelLabel: "Amount Ratio",
    status: "same",
  },
  "summary.rf.y": {
    sheet: "Summary Report",
    excelLabel: "Response Ratio",
    status: "same",
  },
  "summary.rf.rf": {
    sheet: "Summary Report",
    excelLabel: "RF",
    status: "same",
  },
  "summary.rf.included": {
    sheet: "Summary Report",
    excelLabel: "Point inclusion",
    status: "same",
  },
  "summary.ldr.slope": {
    sheet: "Summary Report",
    excelLabel: "Linear Slope",
    status: "same",
  },
  "summary.ldr.intercept": {
    sheet: "Summary Report",
    excelLabel: "Linear Intercept",
    status: "same",
  },
  "summary.ldr.icvTrue": {
    sheet: "Summary Report",
    excelLabel: "ICV Conct",
    status: "same",
  },
  "summary.ldr.icvCalc": {
    sheet: "Summary Report",
    excelLabel: "ICV calculated conc",
    status: "same",
  },
  "summary.ldr.icvPctDiff": {
    sheet: "Summary Report",
    excelLabel: "ICV % Difference from True",
    status: "same",
  },
  "summary.ldr.icvCdsPctDiff": {
    sheet: "Summary Report",
    excelLabel: "ICV % Diff (Inst - Ext Calculator)",
    status: "same",
  },
  "summary.ldr.accept": {
    sheet: "Summary Report",
    excelLabel: "LDR point acceptance",
    status: "same",
  },
  "summary.rf.section": {
    sheet: "Summary Report",
    excelLabel: "Initial Calibration Response Factor (RF) Summary Table",
    status: "same",
    note: "Header Mean RF / %RSD → Average RF / RSD %.",
  },
  "summary.ldr.header": {
    sheet: "Summary Report",
    excelLabel: "Linear Dynamic Range — slope, intercept, ICV block",
    status: "same",
  },

  // —— Readiness / validation ——
  "readiness.issues": {
    status: "na",
    note: "Upload parser diagnostics — Excel has no equivalent issue list.",
  },

  // —— IS summaries ——
  "isSummary.compound": {
    sheet: "Summary Report",
    excelLabel: "Internal Standard Evaluation",
    status: "partial",
    note: "Excel evaluates IS %RSD at report time; WLTR aggregates across runs.",
  },
  "isSummary.min": {
    sheet: "Summary Report",
    excelLabel: "IS response stats",
    status: "partial",
  },
  "isSummary.max": {
    sheet: "Summary Report",
    excelLabel: "IS response stats",
    status: "partial",
  },
  "isSummary.mean": {
    sheet: "Summary Report",
    excelLabel: "IS mean response",
    status: "partial",
  },
  "isSummary.rsdPercent": {
    sheet: "Summary Report",
    location: "M14 criterion",
    excelLabel: "ICAL Internal Standards / Surrogates (RSD%)",
    status: "partial",
    note: "Compared to methodConfig.isRsdPercentLimit (Summary Report M14 / P14).",
  },
  "isSummary.rsdLimit": {
    sheet: "Summary Report",
    location: "M14 / P14",
    excelLabel: "ICAL Internal Standards / Surrogates (RSD%)",
    status: "same",
  },
  "isSummary.rsdPass": {
    sheet: "Summary Report",
    excelLabel: "IS Evaluation pass/fail",
    status: "partial",
  },
  "isSummary.count": {
    status: "na",
    note: "WLTR aggregation count — Excel has no cross-run IS summary table.",
  },
  "isSummary.runs": {
    status: "na",
    note: "WLTR traces distinct CAL runs contributing IS peaks.",
  },
  "isSummary.warn": {
    status: "na",
    note: "WLTR mean-response bounds warning (methodConfig internalStandardResponseMin/Max).",
  },

  // —— Analytes catalog ——
  "analyte.name": {
    sheet: "Ref Table",
    location: "F18+",
    excelLabel: "Compound",
    status: "partial",
    note: "Excel lists method compounds; no CAS column in preload Ref Table.",
  },
  "analyte.defaultInternalStandard": {
    status: "na",
    note: "WLTR global IS assignment at upload; Excel pairs IS in CDS/Ref Table.",
  },
  "analyte.aliases": {
    status: "na",
    note: "CDS raw text → catalog mapping; no Excel alias layer.",
  },

  // —— Instruments ——
  "instrument.name": {
    sheet: "Ref Table",
    location: "Q12",
    excelLabel: "Instrument ID",
    status: "partial",
    note: "Excel free-text only (e.g. GC/MS #4); WLTR full instrument catalog.",
  },
  "instrument.suppressedAnalytes": {
    sheet: "Ref Table",
    excelLabel: "Analyte Switch Off = 2",
    status: "renamed",
    note: "Same intent as method-level Analyte Switch; WLTR scopes per instrument.",
  },
};

/** UI regression label → Excel DVD row block (preload analyte block; pattern repeats per compound). */
export const EXCEL_MODEL_VARIANTS: ReadonlyArray<{
  uiLabel: string;
  dvdRows: string;
  excelLabel: string;
}> = [
  { uiLabel: "Average / None", dvdRows: "246–247", excelLabel: "Average RF" },
  { uiLabel: "Linear / None", dvdRows: "248–249", excelLabel: "Least Squared Regression · Equal Weighting" },
  { uiLabel: "Linear / 1/x", dvdRows: "250–251", excelLabel: "Inverse Conct · Inverse Concentration Weighting" },
  { uiLabel: "Linear / 1/x²", dvdRows: "252–253", excelLabel: "Inverse Sq Conct · Inverse Concentration Squared Weighting" },
  { uiLabel: "Linear (forced zero) / None", dvdRows: "254–255", excelLabel: "Least Squared (forced 0) · LS(Forced 0)" },
  { uiLabel: "Quadratic / None", dvdRows: "256–257", excelLabel: "Quadratric Regression · Equal weighting" },
  { uiLabel: "Quadratic / 1/x", dvdRows: "258–259", excelLabel: "Quad (Inv Conct)" },
  { uiLabel: "Quadratic / 1/x²", dvdRows: "260–261", excelLabel: "Quad (Inv Sqd)" },
  { uiLabel: "Quadratic (forced zero) / None", dvdRows: "262–263", excelLabel: "Quad (Forced 0)" },
];

export const EXCEL_QUICK_LOOKUP: ReadonlyArray<{ uiHint: string; excelWhere: string }> = [
  { uiHint: "Paste quant report", excelWhere: "Cal Data or ICV Data column A" },
  { uiHint: "Method limits & compound switches", excelWhere: "Ref Table" },
  { uiHint: "Nine models & Point Total", excelWhere: "DVD rows 246–267" },
  { uiHint: "ICAL pass/fail report", excelWhere: "Summary Report" },
  { uiHint: "Printable layout", excelWhere: "Report Writer (formatting only)" },
  { uiHint: "Quadratic matrix math", excelWhere: "External Quadratic Regression Program.xls" },
];

export const EXCEL_PAGES: Record<string, ExcelPageGuide> = {
  "method-configs": {
    title: "Method configuration",
    sheets: ["Ref Table", "Summary Report (criteria rows 6–14)"],
    description:
      "Global ICAL criteria and per-analyte limits. Mirrors Ref Table compound switches and Summary Report threshold block.",
    lookupHint: "Ref Table Q-column method header; criteria values in Summary Report G–V columns.",
  },
  "runs-upload": {
    title: "Upload run",
    sheets: ["Cal Data", "ICV Data"],
    description: "Paste target for raw Agilent quantitation reports — same as hidden column A in Excel.",
    lookupHint: "Cal Data row 11 = calibration point headers; ICV Data sample row VOC ICV1.",
  },
  "runs-detail": {
    title: "Run detail",
    sheets: ["Cal Data / ICV Data parsed columns", "DVD rows 240–243 derived ratios"],
    description:
      "Parsed CDS columns plus WLTR-derived ISTD ratios. Resolve mapping and validation are WLTR-only.",
    lookupHint: "Cols C–I = Compound, R.T., Q Ion, Response, Conc (ppb). Column A = hidden paste in Excel.",
  },
  "calibration-group-regression-debug": {
    title: "Regression debug (QA)",
    sheets: ["DVD rows 246–263", "EY–FF247 extrapolation probes"],
    description: "Full regression snapshot JSON — VariantComparisonDto mirrors DVD Calc conc + %Diff rows.",
    lookupHint: "Match Model variant filter to DVD rows 246–262 (see variant table below).",
  },
  "method-config-snapshots": {
    title: "Method config snapshots",
    sheets: ["Ref Table (frozen at compute)"],
    description: "Read-only frozen criteria — same field map as live method config.",
  },
  "calibration-levels": {
    title: "Calibration levels",
    sheets: ["Cal Data row 11", "DVD row 6 Base Concentration"],
    description: "Named cal points and true concentrations fed into Amount Ratio (X).",
  },
  "internal-standards": {
    title: "Internal standards",
    sheets: ["Ref Table IS rows X21–X23"],
    description: "IS spike concentrations used when computing Amount Ratio at upload.",
  },
  "calibration-groups": {
    title: "Calibration groups",
    sheets: ["Cal Data + ICV Data + Ref Table snapshot"],
    description: "WLTR container linking CAL runs, ICV run, and frozen method config — replaces single Excel workbook.",
  },
  "calibration-group-compute": {
    title: "Compute regression",
    sheets: ["Data Visualization Deck (DVD)"],
    description:
      "Runs all nine model variants (rows 246–262) and builds Report Card. Quadratic models use external Quadratic Regression Program.xls in Excel.",
    lookupHint: "DVD recalculates on paste; WLTR uses POST …/compute. Recompute clears exclusions and model selection.",
  },
  "calibration-group-report-card": {
    title: "Report card",
    sheets: ["DVD FF247", "rows 246–267"],
    description: "Model comparison ranked by Point Total, ICV ranking, and low-level extrapolation probes.",
  },
  "calibration-group-regression": {
    title: "Regression inputs",
    sheets: ["DVD rows 240–247 per analyte block"],
    description: "X/Y calibration table with weighting, residuals, %Diff, and point deleter.",
  },
  "calibration-group-summary": {
    title: "Summary report",
    sheets: ["Summary Report", "Report Writer (print layout)"],
    description: "Four ICAL tables: Administrative, Executive, RF summary, Linear dynamic range.",
  },
  "analytes": {
    title: "Analytes catalog",
    sheets: ["Ref Table compound list (partial)"],
    description: "WLTR canonical analyte layer — Excel has fixed compound names, no CAS/aliases.",
    lookupHint: "Ref Table F18+ Compound column; Analyte Switch column.",
  },
  "instruments": {
    title: "Instruments",
    sheets: ["Ref Table Q12 Instrument ID only"],
    description: "WLTR multi-instrument admin — Excel assumes one instrument per workbook.",
  },
};

export function getExcelField(key: string): ExcelFieldAnnotation | undefined {
  return EXCEL_FIELD[key];
}

export function getExcelPage(key: string): ExcelPageGuide | undefined {
  return EXCEL_PAGES[key];
}

export const EXCEL_STATUS_LABEL: Record<ExcelMatchStatus, string> = {
  same: "Same",
  renamed: "Renamed",
  split: "Split",
  partial: "Partial",
  na: "N/A in Excel",
};
