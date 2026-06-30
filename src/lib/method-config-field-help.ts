export type FieldDisplay = { text: string; abbrev?: string };

/** Visible labels: plain language plus optional familiar abbreviation in parentheses. */
export const METHOD_CONFIG_FIELD_DISPLAY = {
  name: { text: "Name" },
  labelMode: { text: "Label mode", abbrev: "R² / r" },
  quantitationMode: { text: "Quantitation mode", abbrev: "ISTD / ESTD" },
  minCorrelation: { text: "Minimum correlation", abbrev: "r / R²" },
  maxRSE: { text: "Maximum RSE" },
  pctDiffLowBound: { text: "Percent diff lower bound", abbrev: "% diff low" },
  pctDiffHighBound: { text: "Percent diff upper bound", abbrev: "% diff high" },
  minPointsRequired: { text: "Minimum calibration points", abbrev: "min points" },
  maxMissedPoints: { text: "Maximum missed points", abbrev: "max missed" },
  icvLimitPercent: { text: "ICV recovery limit", abbrev: "ICV %" },
  rsdPercentLimit: { text: "Target analyte RF limit", abbrev: "RF %RSD" },
  isRsdPercentLimit: { text: "IS / surrogate RF limit", abbrev: "IS RF %RSD" },
  icvCdsParityPercent: { text: "ICV CDS parity limit", abbrev: "ICV vs CDS %" },
  soilDilutionFactor: { text: "Soil dilution factor", abbrev: "soil DF" },
  aqueousDilutionFactor: { text: "Aqueous dilution factor", abbrev: "aqueous DF" },
  internalStandardResponseMin: { text: "IS response minimum", abbrev: "min IS response" },
  internalStandardResponseMax: { text: "IS response maximum", abbrev: "max IS response" },
} as const satisfies Record<string, FieldDisplay>;

export const METHOD_ANALYTE_CRITERIA_FIELD_DISPLAY = {
  analyte: { text: "Analyte" },
  isSpcc: { text: "System performance check", abbrev: "SPCC" },
  minResponseFactor: { text: "Min response factor", abbrev: "min RF" },
  isCcc: { text: "Continued calibration check", abbrev: "CCC" },
  maxRsdPercent: { text: "Max response-factor variation", abbrev: "RF %RSD" },
  methodBlankLimit: { text: "Method blank limit", abbrev: "MB" },
  icvLcsConcentration: { text: "ICV/LCS spike concentration", abbrev: "nominal conc." },
  icvLcsLowerControlLimit: { text: "ICV/LCS lower recovery limit", abbrev: "LCL" },
  icvLcsUpperControlLimit: { text: "ICV/LCS upper recovery limit", abbrev: "UCL" },
  concentrationMultiplier: { text: "Concentration multiplier", abbrev: "conc. ×" },
  surrogateSpikeAmount: { text: "Surrogate spike amount", abbrev: "spike amt" },
  surrogateRecoveryLowerLimit: { text: "Surrogate recovery lower limit", abbrev: "rec. LCL %" },
  surrogateRecoveryUpperLimit: { text: "Surrogate recovery upper limit", abbrev: "rec. UCL %" },
} as const satisfies Record<string, FieldDisplay>;

/** Plain-language help for method configuration form fields. */
export const METHOD_CONFIG_FIELD_HELP = {
  name: "A short name for this method (for example “EPA 8270 ISTD”). Shown when picking a method for calibration groups.",
  labelMode:
    "How fit quality is labeled on reports: R² (coefficient of determination) or the square root of R². Does not change the math — only the display.",
  quantitationMode:
    "What goes on the Y axis of the calibration curve. Internal standard (ISTD) uses response ratio (analyte ÷ IS). External standard (ESTD) uses raw analyte response.",
  minCorrelation:
    "Minimum correlation coefficient (r or R², depending on label mode) for a curve to pass. Typical values are 0.99 or higher.",
  maxRSE:
    "Maximum allowed residual standard error (spread of points around the fitted line). Lower curve RSE must be at or below this limit.",
  pctDiffLowBound:
    "Lowest acceptable percent difference between calculated and true concentration on calibration points. Often negative (for example −20 means up to 20% low).",
  pctDiffHighBound:
    "Highest acceptable percent difference between calculated and true concentration on calibration points (for example +20 means up to 20% high).",
  minPointsRequired:
    "Minimum number of calibration levels (points) required before a group can compute and before a curve can pass.",
  maxMissedPoints:
    "Maximum number of included calibration points that may fail the percent-difference check and still allow the analyte to pass.",
  icvLimitPercent:
    "How far the ICV calculated concentration may differ from the known true value, as a percent. Example: 20 allows ±20% recovery.",
  rsdPercentLimit:
    "Maximum percent relative standard deviation (%RSD) of response factors across calibration levels for target analytes.",
  isRsdPercentLimit:
    "Maximum %RSD allowed for internal-standard and surrogate compound response factors (separate from target analytes).",
  icvCdsParityPercent:
    "Maximum allowed difference between WLTR’s ICV result and the concentration reported by the instrument software (CDS), as a percent.",
  soilDilutionFactor:
    "Optional dilution factor for soil matrices — shown on the summary report for documentation only; it does not change regression math.",
  aqueousDilutionFactor:
    "Optional dilution factor for aqueous matrices — shown on the summary report for documentation only.",
  internalStandardResponseMin:
    "Optional lower bound on mean internal-standard response. If the mean IS response in a run or group falls below this, a warning is flagged.",
  internalStandardResponseMax:
    "Optional upper bound on mean internal-standard response. If the mean IS response exceeds this, a warning is flagged.",
} as const;

export const METHOD_ANALYTE_CRITERIA_FIELD_HELP = {
  analyte: "The compound these limits apply to. Each analyte can have at most one criteria row per method.",
  isSpcc:
    "Mark as System Performance Check Compound (SPCC). When enabled, the minimum response factor limit is evaluated at compute time.",
  minResponseFactor:
    "For SPCC analytes: the mean response factor across included calibration points must be at or above this value.",
  isCcc:
    "Mark as Continued Calibration Check (CCC). When enabled, the response-factor %RSD limit is evaluated for this analyte.",
  maxRsdPercent: "For CCC analytes: response-factor %RSD must be at or below this limit.",
  methodBlankLimit:
    "Maximum allowed signal or concentration on a method blank for this analyte (when blank data is available).",
  icvLcsConcentration:
    "Known spike concentration used for ICV/LCS recovery checks for this analyte (often matches the ICV standard level).",
  icvLcsLowerControlLimit:
    "Lower recovery limit (% or concentration unit per your method). Calculated recovery must not fall below this.",
  icvLcsUpperControlLimit:
    "Upper recovery limit. Calculated recovery must not exceed this. LCL and UCL may be asymmetric.",
  concentrationMultiplier:
    "Per-analyte scaling factor applied to the true concentration before regression (must be > 0, default 1). Use to account for dilution or unit conversion.",
  surrogateSpikeAmount:
    "Nominal spiked amount for surrogate or SMC compounds (denominator for recovery %). Required to enable surrogate recovery checks.",
  surrogateRecoveryLowerLimit:
    "Lower acceptance limit (%) for surrogate/SMC recovery. Omit to disable the lower bound. Must be ≥ 0.",
  surrogateRecoveryUpperLimit:
    "Upper acceptance limit (%) for surrogate/SMC recovery. Must be greater than the lower limit if provided.",
} as const;

export type MethodConfigFieldKey = keyof typeof METHOD_CONFIG_FIELD_HELP;
