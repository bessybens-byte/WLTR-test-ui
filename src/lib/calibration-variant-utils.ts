import {
  hasSelectedModel as hasGroupSelectedModel,
  normalizeRegressionType,
  normalizeWeightingMode,
  type RegressionTypeWire,
  type WeightingModeWire,
  variantKey,
} from "@/lib/regression-wire";

/** Supported regression × weighting pairs from the compute pipeline (used when report-card is unavailable). */
export const STANDARD_CALIBRATION_VARIANTS: readonly CalibrationVariant[] = [
  { regressionType: "Average", weightingMode: "None" },
  { regressionType: "LinearForcedZero", weightingMode: "InverseX" },
  { regressionType: "LinearForcedZero", weightingMode: "InverseXSquared" },
  { regressionType: "Linear", weightingMode: "None" },
  { regressionType: "Linear", weightingMode: "InverseX" },
  { regressionType: "Linear", weightingMode: "InverseXSquared" },
  { regressionType: "Quadratic", weightingMode: "None" },
  { regressionType: "Quadratic", weightingMode: "InverseX" },
  { regressionType: "Quadratic", weightingMode: "InverseXSquared" },
];

export type CalibrationVariant = Readonly<{
  regressionType: RegressionTypeWire;
  weightingMode: WeightingModeWire;
  passCount?: number;
  reportCardScore?: number;
}>;

export { parseVariantKey, variantKey } from "@/lib/regression-wire";
export { modelVariantLabel } from "@/lib/regression-wire";

function variantScore(v: CalibrationVariant): number {
  if (typeof v.passCount === "number") return v.passCount;
  if (typeof v.reportCardScore === "number") return v.reportCardScore;
  return -1;
}

function parseVariantRow(raw: Record<string, unknown>): CalibrationVariant | null {
  const regressionType = normalizeRegressionType(raw.regressionType);
  const weightingMode = normalizeWeightingMode(raw.weightingMode);
  if (!regressionType || !weightingMode) return null;
  return {
    regressionType,
    weightingMode,
    passCount: typeof raw.passCount === "number" ? raw.passCount : undefined,
    reportCardScore: typeof raw.reportCardScore === "number" ? raw.reportCardScore : undefined,
  };
}

/** All ranked variants from GET report-card (`CalibrationGroupReportCardDto.variants`). */
export function groupVariantsFromReportCard(
  reportCard: Record<string, unknown> | undefined,
): CalibrationVariant[] {
  if (!reportCard) return [];
  const variants = Array.isArray(reportCard.variants) ? reportCard.variants : [];
  return variants
    .map((v) => (typeof v === "object" && v !== null ? parseVariantRow(v as Record<string, unknown>) : null))
    .filter((v): v is CalibrationVariant => v !== null)
    .slice()
    .sort((a, b) => variantScore(b) - variantScore(a));
}

/** Variants applicable to one analyte (variant includes that analyte in its breakdown). */
export function variantsFromReportCard(
  reportCard: Record<string, unknown> | undefined,
  analyteId: string,
): CalibrationVariant[] {
  const all = groupVariantsFromReportCard(reportCard);
  if (!reportCard || !analyteId) return all;
  const rawVariants = Array.isArray(reportCard.variants) ? reportCard.variants : [];
  const applicable = rawVariants
    .filter((v) => {
      if (typeof v !== "object" || v === null) return false;
      const analytes = Array.isArray((v as Record<string, unknown>).analytes)
        ? ((v as Record<string, unknown>).analytes as unknown[])
        : [];
      return analytes.some(
        (a) => typeof a === "object" && a !== null && (a as Record<string, unknown>).analyteId === analyteId,
      );
    })
    .map((v) => parseVariantRow(v as Record<string, unknown>))
    .filter((v): v is CalibrationVariant => v !== null);
  return (applicable.length ? applicable : all).slice().sort((a, b) => variantScore(b) - variantScore(a));
}

/** Top-ranked variant flagged with `isSuggestedModel` on the report card. */
export function suggestedModelFromReportCard(
  reportCard: Record<string, unknown> | undefined,
): CalibrationVariant | null {
  if (!reportCard) return null;
  const variants = Array.isArray(reportCard.variants) ? reportCard.variants : [];
  for (const v of variants) {
    if (typeof v !== "object" || v === null) continue;
    const row = v as Record<string, unknown>;
    if (row.isSuggestedModel === true) return parseVariantRow(row);
  }
  return groupVariantsFromReportCard(reportCard)[0] ?? null;
}

export type ResolvedVariantOptions = Readonly<{
  variants: CalibrationVariant[];
  /** True when ranked pass-count data came from GET report-card. */
  fromReportCard: boolean;
}>;

/** Prefer report-card variants; fall back to the standard matrix when the endpoint is missing or empty. */
export function resolveVariantOptions(
  reportCard: Record<string, unknown> | undefined,
  analyteId: string,
  options?: { allowFallback?: boolean },
): ResolvedVariantOptions {
  const fromCard = variantsFromReportCard(reportCard, analyteId);
  if (fromCard.length) return { variants: fromCard, fromReportCard: true };
  if (options?.allowFallback && analyteId) {
    return { variants: [...STANDARD_CALIBRATION_VARIANTS], fromReportCard: false };
  }
  return { variants: [], fromReportCard: false };
}

export { hasGroupSelectedModel };

export type CurveQueryScope = Readonly<{
  laboratoryId?: string;
}>;

export type CurveQueryParams = CurveQueryScope &
  Readonly<{
    regressionType?: RegressionTypeWire;
    weightingMode?: WeightingModeWire;
  }>;

/** First standard variant — bootstraps list/chart requests when the group has no selected model. */
export function defaultBootstrapVariant(): CalibrationVariant {
  return STANDARD_CALIBRATION_VARIANTS[0];
}

/**
 * Build query params for regression-inputs / chart / regression-debug.
 * When the group has no selected model, regressionType and weightingMode are always sent
 * (the API returns 400 otherwise after multi-variant compute).
 */
export function buildCurveQueryParams(
  scope: CurveQueryScope | undefined,
  options: Readonly<{
    groupSelectedModel: boolean;
    activeVariant: CalibrationVariant | null;
  }>,
): CurveQueryParams {
  const base: CurveQueryParams = { ...(scope ?? {}) };
  if (options.groupSelectedModel && !options.activeVariant) {
    return base;
  }
  const variant = options.activeVariant ?? defaultBootstrapVariant();
  return {
    ...base,
    regressionType: variant.regressionType,
    weightingMode: variant.weightingMode,
  };
}

export function pickDefaultVariantKey(
  variants: readonly CalibrationVariant[],
  preferred?: { regressionType: unknown; weightingMode: unknown },
): string {
  if (!variants.length) return "";
  const prefRt = normalizeRegressionType(preferred?.regressionType);
  const prefWm = normalizeWeightingMode(preferred?.weightingMode);
  if (prefRt && prefWm) {
    const key = variantKey(prefRt, prefWm);
    if (variants.some((v) => variantKey(v.regressionType, v.weightingMode) === key)) return key;
  }
  const first = variants[0];
  return variantKey(first.regressionType, first.weightingMode);
}

/**
 * Resolve which variant key to send on chart/debug requests.
 * Returns "" only when the group already has a selected model and the user chose the API default.
 */
export function pickActiveVariantKey(
  variants: readonly CalibrationVariant[],
  options: Readonly<{
    userPickedKey: string | null;
    preferred?: { regressionType: unknown; weightingMode: unknown };
  }>,
): string {
  if (!variants.length) {
    if (!hasGroupSelectedModel(options.preferred)) {
      const boot = defaultBootstrapVariant();
      return variantKey(boot.regressionType, boot.weightingMode);
    }
    return "";
  }

  const groupSelected = hasGroupSelectedModel(options.preferred);

  if (options.userPickedKey === "" && groupSelected) {
    return "";
  }

  if (
    options.userPickedKey &&
    variants.some((v) => variantKey(v.regressionType, v.weightingMode) === options.userPickedKey)
  ) {
    return options.userPickedKey;
  }

  if (!groupSelected) {
    return pickDefaultVariantKey(variants, options.preferred);
  }

  return "";
}
