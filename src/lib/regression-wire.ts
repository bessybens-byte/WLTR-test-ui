/** OpenAPI wire helpers for calibration regression enums and point fields. */

export type RegressionTypeWire = "Average" | "Linear" | "LinearForcedZero" | "Quadratic";
export type WeightingModeWire = "None" | "InverseX" | "InverseXSquared";
export type ExclusionReasonWire =
  | "None"
  | "MissingRatio"
  | "MissingIS"
  | "InvalidX"
  | "ManualExclude"
  | "PctDiffOutOfRange";

const REGRESSION_TYPE_BY_NAME: Record<string, RegressionTypeWire> = {
  Average: "Average",
  Linear: "Linear",
  LinearForcedZero: "LinearForcedZero",
  Quadratic: "Quadratic",
};

const WEIGHTING_MODE_BY_NAME: Record<string, WeightingModeWire> = {
  None: "None",
  InverseX: "InverseX",
  InverseXSquared: "InverseXSquared",
};

const REGRESSION_TYPE_ORDINAL: Record<number, RegressionTypeWire> = {
  0: "Average",
  1: "Linear",
  2: "LinearForcedZero",
  3: "Quadratic",
};

const WEIGHTING_MODE_ORDINAL: Record<number, WeightingModeWire> = {
  0: "None",
  1: "InverseX",
  2: "InverseXSquared",
};

export const REGRESSION_TYPE_LABEL: Record<RegressionTypeWire, string> = {
  Average: "Average",
  Linear: "Linear",
  LinearForcedZero: "Linear (forced zero)",
  Quadratic: "Quadratic",
};

export const WEIGHTING_MODE_LABEL: Record<WeightingModeWire, string> = {
  None: "None",
  InverseX: "1/x",
  InverseXSquared: "1/x²",
};

export const EXCLUSION_REASON_LABEL: Record<ExclusionReasonWire, string> = {
  None: "None",
  ManualExclude: "Manual exclude",
  PctDiffOutOfRange: "% diff out of range",
  MissingRatio: "Missing ratio",
  MissingIS: "Missing IS",
  InvalidX: "Invalid X",
};

export function normalizeRegressionType(v: unknown): RegressionTypeWire | null {
  if (typeof v === "string" && v in REGRESSION_TYPE_BY_NAME) return REGRESSION_TYPE_BY_NAME[v];
  if (typeof v === "number" && Number.isFinite(v) && v in REGRESSION_TYPE_ORDINAL) {
    return REGRESSION_TYPE_ORDINAL[v];
  }
  return null;
}

export function normalizeWeightingMode(v: unknown): WeightingModeWire | null {
  if (typeof v === "string" && v in WEIGHTING_MODE_BY_NAME) return WEIGHTING_MODE_BY_NAME[v];
  if (typeof v === "number" && Number.isFinite(v) && v in WEIGHTING_MODE_ORDINAL) {
    return WEIGHTING_MODE_ORDINAL[v];
  }
  return null;
}

export function regressionTypeLabel(v: unknown): string {
  const wire = normalizeRegressionType(v);
  return wire ? REGRESSION_TYPE_LABEL[wire] : typeof v === "string" || typeof v === "number" ? String(v) : "—";
}

export function weightingModeLabel(v: unknown): string {
  const wire = normalizeWeightingMode(v);
  return wire ? WEIGHTING_MODE_LABEL[wire] : typeof v === "string" || typeof v === "number" ? String(v) : "—";
}

export function modelVariantLabel(regressionType: unknown, weightingMode: unknown): string {
  return `${regressionTypeLabel(regressionType)} · ${weightingModeLabel(weightingMode)}`;
}

export function variantKey(regressionType: unknown, weightingMode: unknown): string {
  const rt = normalizeRegressionType(regressionType);
  const wm = normalizeWeightingMode(weightingMode);
  return rt && wm ? `${rt}:${wm}` : "";
}

export function parseVariantKey(key: string): { regressionType: RegressionTypeWire; weightingMode: WeightingModeWire } | null {
  const parts = key.split(":");
  if (parts.length !== 2) return null;
  const regressionType = normalizeRegressionType(parts[0]);
  const weightingMode = normalizeWeightingMode(parts[1]);
  if (!regressionType || !weightingMode) return null;
  return { regressionType, weightingMode };
}

export function variantsMatch(aRt: unknown, aWm: unknown, bRt: unknown, bWm: unknown): boolean {
  return normalizeRegressionType(aRt) === normalizeRegressionType(bRt) &&
    normalizeWeightingMode(aWm) === normalizeWeightingMode(bWm);
}

export function hasSelectedModel(preferred?: {
  regressionType: unknown;
  weightingMode: unknown;
}): boolean {
  return normalizeRegressionType(preferred?.regressionType) != null &&
    normalizeWeightingMode(preferred?.weightingMode) != null;
}

export function exclusionReasonLabel(v: unknown): string {
  if (typeof v === "string" && v in EXCLUSION_REASON_LABEL) return EXCLUSION_REASON_LABEL[v as ExclusionReasonWire];
  if (typeof v === "number" && Number.isFinite(v)) {
    const byOrdinal: Record<number, ExclusionReasonWire> = {
      0: "None",
      1: "ManualExclude",
      2: "PctDiffOutOfRange",
      3: "MissingRatio",
      4: "MissingIS",
      5: "InvalidX",
    };
    const wire = byOrdinal[v];
    return wire ? EXCLUSION_REASON_LABEL[wire] : String(v);
  }
  return typeof v === "string" ? v : "—";
}

export function regressionPointAmountRatio(p: Record<string, unknown>): unknown {
  return p.amountRatio ?? p.x;
}

export function regressionPointResponseRatio(p: Record<string, unknown>): unknown {
  return p.responseRatio ?? p.y;
}

export function regressionPointPredictedResponse(p: Record<string, unknown>): unknown {
  return p.predictedResponseRatio ?? p.predictedY ?? p.predictedYValue;
}

export function hasComputedRegressionOutputs(points: readonly Record<string, unknown>[]): boolean {
  for (let i = 0; i < points.length; i++) {
    if (regressionPointPredictedResponse(points[i]) != null) return true;
  }
  return false;
}

export function analyteCalStatusLabel(v: unknown): string {
  if (v === "Pass" || v === 1) return "Pass";
  if (v === "Fail" || v === 0) return "Fail";
  return typeof v === "string" || typeof v === "number" ? String(v) : "—";
}

export function analyteCalStatusTone(v: unknown): "ok" | "bad" | "neutral" {
  if (v === "Pass" || v === 1) return "ok";
  if (v === "Fail" || v === 0) return "bad";
  return "neutral";
}
