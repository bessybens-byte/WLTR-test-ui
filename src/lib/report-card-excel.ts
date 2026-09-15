import {
  modelVariantLabel,
  normalizeRegressionType,
  normalizeWeightingMode,
  variantKey,
  type RegressionTypeWire,
  type WeightingModeWire,
} from "@/lib/regression-wire";

/** One analyte row inside a report-card variant. */
export type ReportCardAnalyteRow = Readonly<{
  analyteId: string;
  analyteName: string;
  calStatus: unknown;
  rSquared: number | null;
  correlationR: number | null;
  rse: number | null;
  /** Workbook BC: 1 = RSD pass, 100 = RSD fail. Average RF only; null elsewhere. */
  rsdPassGate: number | null;
  /** RF %RSD used by the Average gate (Average RF only). */
  responseFactorRsd: number | null;
  missedPointCount: number | null;
  icvPassed: boolean | null;
  isSelected: boolean;
}>;

/** DVD ranking + grade columns for one model row (Excel columns BC–BU). */
export type ReportCardModelMetrics = Readonly<{
  /** BC */
  rsdGrade: string;
  /** BD */
  rGrade: string;
  /** BE */
  codGrade: string;
  /** BF — raw count, not a rank. */
  pointsBelowLowerBound: number | null;
  /** BG — raw count, not a rank. */
  pointsAboveUpperBound: number | null;
  /** BH — raw count, not a rank. */
  failTotalDoubleCounted: number | null;
  /** BI */
  zeroAreaRank: number | null;
  /** BJ */
  cal125PercentRank: number | null;
  /** BK */
  cal25PercentRank: number | null;
  /** BL */
  cal50PercentRank: number | null;
  /** BM */
  cal75PercentRank: number | null;
  /** BN */
  overallExtrapolationRank: number | null;
  /** BO */
  negativeAreaRank: number | null;
  /** BP */
  icvRank: number | null;
  /** BR */
  pointTotal: number | null;
  /** BS */
  pointTotalRank: number | null;
  /** BT — blank on the 2 forced-zero rows. */
  nonForcedZeroPointTotal: number | null;
  /** BU — blank on the 2 forced-zero rows. */
  nonForcedZeroModelRank: number | null;
  /** True when point total / extrapolation ranks came from the API payload. */
  fromApi: boolean;
}>;

/** One model variant row on the Excel-style report card. */
export type ReportCardModelRow = Readonly<{
  key: string;
  regressionType: RegressionTypeWire | null;
  weightingMode: WeightingModeWire | null;
  excelLabel: string;
  rowClass: string;
  analyte: ReportCardAnalyteRow | null;
  metrics: ReportCardModelMetrics;
}>;

/** Row 35/36 threshold labels — same for every analyte block. */
export type ReportCardColumnLabels = Readonly<{
  rsd: string;
  r: string;
  cod: string;
}>;

export type ReportCardAnalyteTable = Readonly<{
  analyteId: string;
  analyteName: string;
  rows: ReportCardModelRow[];
  bestOverallKey: string | null;
  bestNonForcedZeroKey: string | null;
  /** BH64 text — analyteRecommendations[].recommendedModelLabel, or cautionText override. */
  bestOverallLabel: string | null;
  bestOverallCaution: string | null;
  /** BH65 text — analyteRecommendations[].nonForcedZeroModelLabel, or cautionText override. */
  bestNonForcedZeroLabel: string | null;
  bestNonForcedZeroCaution: string | null;
  columnLabels: ReportCardColumnLabels;
  hasFullDvdMetrics: boolean;
}>;

export type MethodGradeThresholds = Readonly<{
  /** r (correlation coefficient) pass threshold — workbook default 0.995. Used only when the API omits rGrade. */
  minCorrelation: number;
  /** COD (r²) pass threshold — workbook default 0.900025 (0.995²). Used only when the API omits codGrade. */
  minCod: number;
}>;

type ModelDef = Readonly<{
  key: string;
  regressionType: RegressionTypeWire | null;
  weightingMode: WeightingModeWire | null;
  excelLabel: string;
  rowClass: string;
  forcedZero: boolean;
}>;

/** Fixed model order matching DVD rows 246–262 (nine Excel rows). */
export const REPORT_CARD_MODEL_ORDER: readonly ModelDef[] = [
  { key: "Average:None", regressionType: "Average", weightingMode: "None", excelLabel: "Average RF", rowClass: "bg-blue-600 text-white", forcedZero: false },
  { key: "Linear:None", regressionType: "Linear", weightingMode: "None", excelLabel: "LS (EW)", rowClass: "bg-purple-700 text-white", forcedZero: false },
  { key: "Linear:InverseX", regressionType: "Linear", weightingMode: "InverseX", excelLabel: "LS (Inv conct)", rowClass: "bg-cyan-400 text-neutral-900", forcedZero: false },
  { key: "Linear:InverseXSquared", regressionType: "Linear", weightingMode: "InverseXSquared", excelLabel: "LS (Inv Sqd)", rowClass: "bg-orange-400 text-neutral-900", forcedZero: false },
  { key: "LinearForcedZero:None", regressionType: "LinearForcedZero", weightingMode: "None", excelLabel: "LS(Forced 0)", rowClass: "bg-lime-700 text-white", forcedZero: true },
  { key: "Quadratic:None", regressionType: "Quadratic", weightingMode: "None", excelLabel: "Quad (EW)", rowClass: "bg-green-400 text-neutral-900", forcedZero: false },
  { key: "Quadratic:InverseX", regressionType: "Quadratic", weightingMode: "InverseX", excelLabel: "Quad (Inv Conct)", rowClass: "bg-orange-600 text-white", forcedZero: false },
  { key: "Quadratic:InverseXSquared", regressionType: "Quadratic", weightingMode: "InverseXSquared", excelLabel: "Quad (Inv Sqd)", rowClass: "bg-yellow-300 text-neutral-900", forcedZero: false },
  { key: "QuadraticForcedZero:None", regressionType: "QuadraticForcedZero", weightingMode: "None", excelLabel: "Quad (Forced 0)", rowClass: "bg-sky-300 text-neutral-900", forcedZero: true },
];

const MODEL_BY_KEY = new Map(REPORT_CARD_MODEL_ORDER.map((m) => [m.key, m]));

function numField(raw: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function strField(raw: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function modelKeyFromRaw(raw: Record<string, unknown>): string | null {
  const rt = normalizeRegressionType(raw.regressionType);
  const wm = normalizeWeightingMode(raw.weightingMode);
  if (!rt || !wm) return null;
  return variantKey(rt, wm);
}

function isQuadraticInverse(rt: RegressionTypeWire | null, wm: WeightingModeWire | null): boolean {
  return rt === "Quadratic" && (wm === "InverseX" || wm === "InverseXSquared");
}

/**
 * Workbook BC (RSD letter/gate). API sets this only on Average RF; other models leave it
 * null so the RSD column stays blank. Never fall back to rankingBreakdown.passGate — that
 * gate is r/COD for non-Average rows.
 */
function parseRsdPassGate(raw: Record<string, unknown>): number | null {
  const top = numField(raw, "rsdPassGate");
  if (top != null) return top;
  const breakdown = raw.rankingBreakdown;
  if (typeof breakdown !== "object" || breakdown === null) return null;
  return numField(breakdown as Record<string, unknown>, "rsdPassGate");
}

/** RF %RSD backing the Average gate (Average RF only). */
function parseResponseFactorRsd(raw: Record<string, unknown>): number | null {
  const top = numField(raw, "responseFactorRsd");
  if (top != null) return top;
  const breakdown = raw.rankingBreakdown;
  if (typeof breakdown !== "object" || breakdown === null) return null;
  return numField(breakdown as Record<string, unknown>, "responseFactorRsd");
}

/** Optional per-row display label (BB column, `variants[].modelLabel`). */
function parseModelLabel(raw: Record<string, unknown>): string | null {
  return strField(raw, "modelLabel");
}

function parseAnalyte(raw: unknown, fallbackId?: string, fallbackName?: string): ReportCardAnalyteRow | null {
  if (typeof raw !== "object" || raw === null) {
    if (!fallbackId) return null;
    return {
      analyteId: fallbackId,
      analyteName: fallbackName ?? fallbackId,
      calStatus: null,
      rSquared: null,
      correlationR: null,
      rse: null,
      rsdPassGate: null,
      responseFactorRsd: null,
      missedPointCount: null,
      icvPassed: null,
      isSelected: false,
    };
  }
  const a = raw as Record<string, unknown>;
  const analyteId = typeof a.analyteId === "string" ? a.analyteId : fallbackId ?? "";
  if (!analyteId) return null;
  return {
    analyteId,
    analyteName: typeof a.analyteName === "string" ? a.analyteName : fallbackName ?? analyteId,
    calStatus: a.calStatus,
    rSquared: typeof a.rSquared === "number" ? a.rSquared : null,
    correlationR: typeof a.correlationR === "number" ? a.correlationR : null,
    rse: typeof a.rse === "number" ? a.rse : null,
    rsdPassGate: parseRsdPassGate(a),
    responseFactorRsd: parseResponseFactorRsd(a),
    missedPointCount: typeof a.missedPointCount === "number" ? a.missedPointCount : null,
    icvPassed: typeof a.icvPassed === "boolean" ? a.icvPassed : null,
    isSelected: a.isSelectedModel === true || a.isSelected === true,
  };
}

function fitGrade(value: number | null, threshold: number, higherIsBetter: boolean): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const pass = higherIsBetter ? value >= threshold : value <= threshold;
  return pass ? "A+" : "F";
}

/** Workbook RSD column: pass-gate 1 → A+, 100 → F. */
function rsdPassGateGrade(gate: number | null): string {
  if (gate == null || !Number.isFinite(gate)) return "—";
  return gate <= 1 ? "A+" : "F";
}

function rankDense(
  items: ReadonlyArray<{ key: string; value: number | null }>,
  lowerIsBetter: boolean,
): Map<string, number> {
  const valid = items.filter((i): i is { key: string; value: number } => i.value != null);
  valid.sort((a, b) => (lowerIsBetter ? a.value - b.value : b.value - a.value));
  const ranks = new Map<string, number>();
  let rank = 1;
  for (let i = 0; i < valid.length; i++) {
    if (i > 0 && valid[i].value !== valid[i - 1].value) rank = i + 1;
    ranks.set(valid[i].key, rank);
  }
  return ranks;
}

/** BF–BP: raw counts (BF–BH) plus probe/overall/negative/ICV ranks (BI–BP). */
function parseRankingBreakdown(raw: Record<string, unknown>): Partial<ReportCardModelMetrics> {
  const metrics: Partial<ReportCardModelMetrics> = {
    pointTotal: numField(raw, "pointTotal", "pointTotalScore"),
    pointTotalRank: numField(raw, "modelRank", "pointTotalRank", "pointTotalRanking"),
    nonForcedZeroPointTotal: numField(raw, "nonForcedZeroPointTotal", "pointTotalWithoutForcedZero"),
    nonForcedZeroModelRank: numField(
      raw,
      "nonForcedZeroModelRank",
      "pointTotalWithoutForcedZeroRank",
      "modelRankNonForcedZero",
    ),
  };

  const breakdown = raw.rankingBreakdown;
  if (typeof breakdown !== "object" || breakdown === null) {
    return metrics;
  }

  const b = breakdown as Record<string, unknown>;
  const probes = Array.isArray(b.probeDeviationRanks) ? b.probeDeviationRanks : [];
  const probeRank = (index: number): number | null =>
    typeof probes[index] === "number" && Number.isFinite(probes[index]) ? (probes[index] as number) : null;

  const below = numField(b, "pointsBelowLowerBound");
  const above = numField(b, "pointsAboveUpperBound");
  const failTotal = numField(b, "failTotalDoubleCounted") ?? (below != null && above != null ? below + above : null);

  return {
    ...metrics,
    pointsBelowLowerBound: below,
    pointsAboveUpperBound: above,
    failTotalDoubleCounted: failTotal,
    zeroAreaRank: probeRank(0) ?? numField(b, "zeroAreaRank", "extrapolationZeroRank"),
    cal125PercentRank: probeRank(1) ?? numField(b, "cal125PercentRank", "extrapolation125PercentRank"),
    cal25PercentRank: probeRank(2) ?? numField(b, "cal25PercentRank", "extrapolation25PercentRank"),
    cal50PercentRank: probeRank(3) ?? numField(b, "cal50PercentRank", "extrapolation50PercentRank"),
    cal75PercentRank: probeRank(4) ?? numField(b, "cal75PercentRank", "extrapolation75PercentRank"),
    overallExtrapolationRank: numField(b, "overallDeviationRank", "overallExtrapolationRank"),
    negativeAreaRank: numField(b, "negativeAreaRank"),
    icvRank: numField(b, "icvRank"),
  };
}

/** BD/BE: prefer the API's own letter grade; local threshold math is a fallback only. */
function parseApiMetrics(raw: Record<string, unknown>): Partial<ReportCardModelMetrics> {
  return {
    rsdGrade: strField(raw, "rsdGrade", "rsdLetterGrade", "rsdLetter") ?? undefined,
    rGrade: strField(raw, "correlationRGrade", "rGrade", "correlationGrade", "rLetterGrade", "rLetter") ?? undefined,
    codGrade: strField(raw, "codGrade", "codLetterGrade", "rSquaredGrade", "codLetter") ?? undefined,
    ...parseRankingBreakdown(raw),
  };
}

function metricsFromApi(
  raw: Record<string, unknown> | null,
  analyte: ReportCardAnalyteRow | null,
  thresholds: MethodGradeThresholds,
): { metrics: ReportCardModelMetrics } {
  const api = raw ? parseApiMetrics(raw) : {};
  const rsdGate = analyte?.rsdPassGate ?? (raw ? parseRsdPassGate(raw) : null);

  const fromApi = Boolean(
    api.pointTotal != null ||
      api.pointTotalRank != null ||
      api.overallExtrapolationRank != null ||
      api.icvRank != null ||
      api.pointsBelowLowerBound != null ||
      api.rsdGrade ||
      rsdGate != null,
  );

  return {
    metrics: {
      rsdGrade: api.rsdGrade ?? rsdPassGateGrade(rsdGate),
      rGrade: api.rGrade ?? fitGrade(analyte?.correlationR ?? null, thresholds.minCorrelation, true),
      codGrade: api.codGrade ?? fitGrade(analyte?.rSquared ?? null, thresholds.minCod, true),
      pointsBelowLowerBound: api.pointsBelowLowerBound ?? null,
      pointsAboveUpperBound: api.pointsAboveUpperBound ?? null,
      failTotalDoubleCounted: api.failTotalDoubleCounted ?? null,
      zeroAreaRank: api.zeroAreaRank ?? null,
      cal125PercentRank: api.cal125PercentRank ?? null,
      cal25PercentRank: api.cal25PercentRank ?? null,
      cal50PercentRank: api.cal50PercentRank ?? null,
      cal75PercentRank: api.cal75PercentRank ?? null,
      overallExtrapolationRank: api.overallExtrapolationRank ?? null,
      negativeAreaRank: api.negativeAreaRank ?? null,
      icvRank: api.icvRank ?? null,
      pointTotal: api.pointTotal ?? null,
      pointTotalRank: api.pointTotalRank ?? null,
      nonForcedZeroPointTotal: api.nonForcedZeroPointTotal ?? null,
      nonForcedZeroModelRank: api.nonForcedZeroModelRank ?? null,
      fromApi,
    },
  };
}

/**
 * Client-side fallbacks only for columns the API may omit: ICV rank (from icvPassed),
 * Point Total rank (from Point Total), and the two non-forced-zero columns (BT/BU),
 * which are always masked to null on the two forced-zero rows regardless of source.
 */
function applyClientFallbacks(rows: ReportCardModelRow[]): ReportCardModelRow[] {
  const needsIcv = rows.some((r) => r.metrics.icvRank == null && r.analyte?.icvPassed != null);
  const icvRank = needsIcv
    ? rankDense(
        rows.map((r) => ({
          key: r.key,
          value: r.analyte?.icvPassed == null ? null : r.analyte.icvPassed ? 1 : 9,
        })),
        true,
      )
    : new Map<string, number>();

  const withIcv = rows.map((r) => ({
    ...r,
    metrics: { ...r.metrics, icvRank: r.metrics.icvRank ?? icvRank.get(r.key) ?? null },
  }));

  const hasPointTotalRank = withIcv.some((r) => r.metrics.pointTotalRank != null);
  const ptRank = hasPointTotalRank
    ? null
    : rankDense(
        withIcv.map((r) => ({ key: r.key, value: r.metrics.pointTotal })),
        true,
      );

  const ranked = withIcv.map((r) => ({
    ...r,
    metrics: { ...r.metrics, pointTotalRank: r.metrics.pointTotalRank ?? ptRank?.get(r.key) ?? null },
  }));

  const nonForced = ranked.filter((r) => !MODEL_BY_KEY.get(r.key)?.forcedZero);
  const hasNonForcedRank = nonForced.some((r) => r.metrics.nonForcedZeroModelRank != null);
  const nonForcedRank = hasNonForcedRank
    ? null
    : rankDense(
        nonForced.map((r) => ({ key: r.key, value: r.metrics.pointTotal })),
        true,
      );

  return ranked.map((r) => {
    const isForcedZero = MODEL_BY_KEY.get(r.key)?.forcedZero ?? false;
    return {
      ...r,
      metrics: {
        ...r.metrics,
        nonForcedZeroPointTotal: isForcedZero
          ? null
          : r.metrics.nonForcedZeroPointTotal ?? r.metrics.pointTotal ?? null,
        nonForcedZeroModelRank: isForcedZero
          ? null
          : r.metrics.nonForcedZeroModelRank ?? nonForcedRank?.get(r.key) ?? null,
      },
    };
  });
}

type RecommendationInfo = Readonly<{
  bestOverallKey: string | null;
  bestNonForcedZeroKey: string | null;
  bestOverallLabel: string | null;
  bestOverallCaution: string | null;
  bestNonForcedZeroLabel: string | null;
  bestNonForcedZeroCaution: string | null;
}>;

/** Picker cells: BH64/BH65 — recommendedModelLabel / nonForcedZeroModelLabel, with cautionText override. */
function parseRecommendation(raw: Record<string, unknown>): RecommendationInfo {
  const rt = normalizeRegressionType(raw.recommendedRegressionType);
  const wm = normalizeWeightingMode(raw.recommendedWeightingMode);
  const nfRt = normalizeRegressionType(raw.nonForcedZeroRegressionType);
  const nfWm = normalizeWeightingMode(raw.nonForcedZeroWeightingMode);

  const explicitCaution = strField(raw, "cautionText", "caution", "warningText");
  const cautionActive = explicitCaution != null || raw.quadraticInverseCaution === true;
  const cautionText = explicitCaution ?? (cautionActive ? "Quadratic inverse-weighted pick — check instrument COD." : null);

  const overallLabel = strField(raw, "recommendedModelLabel", "recommendedExcelLabel") ?? (rt && wm ? modelVariantLabel(rt, wm) : null);
  const nonForcedLabel =
    strField(raw, "nonForcedZeroModelLabel", "nonForcedZeroExcelLabel") ?? (nfRt && nfWm ? modelVariantLabel(nfRt, nfWm) : null);

  return {
    bestOverallKey: rt && wm ? variantKey(rt, wm) : null,
    bestNonForcedZeroKey: nfRt && nfWm ? variantKey(nfRt, nfWm) : null,
    bestOverallLabel: overallLabel,
    bestOverallCaution: cautionActive && isQuadraticInverse(rt, wm) ? cautionText : null,
    bestNonForcedZeroLabel: nonForcedLabel,
    bestNonForcedZeroCaution: cautionActive && isQuadraticInverse(nfRt, nfWm) ? cautionText : null,
  };
}

function applyAnalyteRecommendations(byAnalyte: Map<string, AnalyteBuild>, reportCard: Record<string, unknown>): void {
  const recommendations = Array.isArray(reportCard.analyteRecommendations) ? reportCard.analyteRecommendations : [];
  for (const raw of recommendations) {
    if (typeof raw !== "object" || raw === null) continue;
    const rec = raw as Record<string, unknown>;
    const analyteId = typeof rec.analyteId === "string" ? rec.analyteId : "";
    if (!analyteId) continue;
    const entry = byAnalyte.get(analyteId);
    if (!entry) continue;
    const info = parseRecommendation(rec);
    if (info.bestOverallKey) entry.bestOverallKey = info.bestOverallKey;
    if (info.bestNonForcedZeroKey) entry.bestNonForcedZeroKey = info.bestNonForcedZeroKey;
    if (info.bestOverallLabel) entry.bestOverallLabel = info.bestOverallLabel;
    if (info.bestOverallCaution) entry.bestOverallCaution = info.bestOverallCaution;
    if (info.bestNonForcedZeroLabel) entry.bestNonForcedZeroLabel = info.bestNonForcedZeroLabel;
    if (info.bestNonForcedZeroCaution) entry.bestNonForcedZeroCaution = info.bestNonForcedZeroCaution;
  }
}

function selectionKeys(reportCard: Record<string, unknown>): Map<string, string> {
  const out = new Map<string, string>();
  const selections = Array.isArray(reportCard.analyteSelections) ? reportCard.analyteSelections : [];
  for (const raw of selections) {
    if (typeof raw !== "object" || raw === null) continue;
    const sel = raw as Record<string, unknown>;
    const analyteId = typeof sel.analyteId === "string" ? sel.analyteId : "";
    const rt = normalizeRegressionType(sel.regressionType ?? sel.selectedRegressionType);
    const wm = normalizeWeightingMode(sel.weightingMode ?? sel.selectedWeightingMode);
    if (analyteId && rt && wm) out.set(analyteId, variantKey(rt, wm));
  }
  return out;
}

function applySelections(rows: ReportCardModelRow[], selectedByAnalyte: Map<string, string>): ReportCardModelRow[] {
  return rows.map((row) => {
    if (!row.analyte) return row;
    const selectedKey = selectedByAnalyte.get(row.analyte.analyteId);
    const isSelected = row.analyte.isSelected || (selectedKey != null && selectedKey === row.key);
    return isSelected === row.analyte.isSelected ? row : { ...row, analyte: { ...row.analyte, isSelected } };
  });
}

type VariantSlot = { analyte: ReportCardAnalyteRow | null; raw: Record<string, unknown> | null; modelLabel: string | null };

type AnalyteBuild = {
  analyteId: string;
  analyteName: string;
  byVariant: Map<string, VariantSlot>;
  bestOverallKey: string | null;
  bestNonForcedZeroKey: string | null;
  bestOverallLabel: string | null;
  bestOverallCaution: string | null;
  bestNonForcedZeroLabel: string | null;
  bestNonForcedZeroCaution: string | null;
};

function newAnalyteBuild(analyteId: string, analyteName: string): AnalyteBuild {
  return {
    analyteId,
    analyteName,
    byVariant: new Map(),
    bestOverallKey: null,
    bestNonForcedZeroKey: null,
    bestOverallLabel: null,
    bestOverallCaution: null,
    bestNonForcedZeroLabel: null,
    bestNonForcedZeroCaution: null,
  };
}

function collectAnalyteCentric(reportCard: Record<string, unknown>): AnalyteBuild[] {
  const topAnalytes = Array.isArray(reportCard.analytes) ? reportCard.analytes : [];
  return topAnalytes
    .map((rawA) => {
      if (typeof rawA !== "object" || rawA === null) return null;
      const block = rawA as Record<string, unknown>;
      const analyteId = typeof block.analyteId === "string" ? block.analyteId : "";
      if (!analyteId) return null;
      const analyteName = typeof block.analyteName === "string" ? block.analyteName : analyteId;
      const entry = newAnalyteBuild(analyteId, analyteName);

      const modelRows = Array.isArray(block.models)
        ? block.models
        : Array.isArray(block.variants)
          ? block.variants
          : Array.isArray(block.modelRows)
            ? block.modelRows
            : [];

      for (const rawRow of modelRows) {
        if (typeof rawRow !== "object" || rawRow === null) continue;
        const row = rawRow as Record<string, unknown>;
        const key = modelKeyFromRaw(row);
        if (!key) continue;
        entry.byVariant.set(key, {
          analyte: parseAnalyte(row, analyteId, analyteName),
          raw: row,
          modelLabel: parseModelLabel(row),
        });
      }

      entry.bestOverallKey =
        bestModelKey(block.bestOverallRankedModel) ?? bestModelKey(block.bestOverallModel) ?? bestModelKey(block.suggestedModel);
      entry.bestNonForcedZeroKey = bestModelKey(block.bestRankedNonForcedZeroModel) ?? bestModelKey(block.bestNonForcedZeroModel);

      return entry;
    })
    .filter((x): x is AnalyteBuild => x !== null);
}

function collectVariantCentric(reportCard: Record<string, unknown>): AnalyteBuild[] {
  const variants = Array.isArray(reportCard.variants) ? reportCard.variants : [];
  const byAnalyte = new Map<string, AnalyteBuild>();

  for (const rawV of variants) {
    if (typeof rawV !== "object" || rawV === null) continue;
    const v = rawV as Record<string, unknown>;
    const rt = normalizeRegressionType(v.regressionType);
    const wm = normalizeWeightingMode(v.weightingMode);
    if (!rt || !wm) continue;
    const key = variantKey(rt, wm);
    const modelLabel = parseModelLabel(v);
    const analytes = Array.isArray(v.analytes) ? v.analytes : [];
    for (const rawA of analytes) {
      const analyte = parseAnalyte(rawA);
      if (!analyte) continue;
      let entry = byAnalyte.get(analyte.analyteId);
      if (!entry) {
        entry = newAnalyteBuild(analyte.analyteId, analyte.analyteName);
        byAnalyte.set(analyte.analyteId, entry);
      }
      entry.byVariant.set(key, {
        analyte,
        raw: typeof rawA === "object" && rawA !== null ? (rawA as Record<string, unknown>) : null,
        modelLabel,
      });
      if (typeof rawA === "object" && rawA !== null) {
        const row = rawA as Record<string, unknown>;
        if (row.isRecommendedModel === true) entry.bestOverallKey = key;
        if (row.isRecommendedNonForcedZeroModel === true) entry.bestNonForcedZeroKey = key;
      }
    }
  }

  return [...byAnalyte.values()];
}

function bestModelKey(raw: unknown): string | null {
  if (typeof raw !== "object" || raw === null) return null;
  const key = modelKeyFromRaw(raw as Record<string, unknown>);
  if (key) return key;
  const label = strField(raw as Record<string, unknown>, "excelLabel", "modelLabel", "label");
  if (label) {
    const match = REPORT_CARD_MODEL_ORDER.find((m) => m.excelLabel === label);
    return match?.key ?? null;
  }
  return null;
}

function resolveBestKeys(
  table: Pick<ReportCardAnalyteTable, "rows">,
  entry: AnalyteBuild,
): Pick<
  ReportCardAnalyteTable,
  "bestOverallKey" | "bestNonForcedZeroKey" | "bestOverallLabel" | "bestOverallCaution" | "bestNonForcedZeroLabel" | "bestNonForcedZeroCaution"
> {
  const rowByKey = (key: string | null) => table.rows.find((r) => r.key === key) ?? null;

  let bestOverallKey = entry.bestOverallKey;
  let bestNonForcedZeroKey = entry.bestNonForcedZeroKey;

  if (!bestOverallKey && !bestNonForcedZeroKey) {
    const scored = table.rows.filter((r) => r.metrics.pointTotal != null);
    bestOverallKey = scored.length === 0 ? null : [...scored].sort((a, b) => a.metrics.pointTotal! - b.metrics.pointTotal!)[0]?.key ?? null;
    const nonForced = scored.filter((r) => !MODEL_BY_KEY.get(r.key)?.forcedZero);
    bestNonForcedZeroKey = nonForced.length === 0 ? null : [...nonForced].sort((a, b) => a.metrics.pointTotal! - b.metrics.pointTotal!)[0]?.key ?? null;
  }

  const overallRow = rowByKey(bestOverallKey);
  const nonForcedRow = rowByKey(bestNonForcedZeroKey);

  return {
    bestOverallKey,
    bestNonForcedZeroKey,
    bestOverallLabel: entry.bestOverallLabel ?? overallRow?.excelLabel ?? null,
    bestOverallCaution: entry.bestOverallCaution,
    bestNonForcedZeroLabel: entry.bestNonForcedZeroLabel ?? nonForcedRow?.excelLabel ?? null,
    bestNonForcedZeroCaution: entry.bestNonForcedZeroCaution,
  };
}

/** Background for rank cells 1 (best) → 9 (worst). */
export function rankCellClass(rank: number | null): string {
  if (rank == null) return "bg-neutral-100 dark:bg-neutral-900";
  if (rank <= 2) return "bg-emerald-200 text-emerald-950 dark:bg-emerald-900/50 dark:text-emerald-100";
  if (rank <= 4) return "bg-lime-100 text-lime-950 dark:bg-lime-950/40 dark:text-lime-100";
  if (rank <= 6) return "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100";
  if (rank <= 8) return "bg-orange-200 text-orange-950 dark:bg-orange-950/40 dark:text-orange-100";
  return "bg-red-200 text-red-950 dark:bg-red-950/40 dark:text-red-100";
}

export function gradeCellClass(grade: string): string {
  if (grade === "A+") return "bg-white font-semibold text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
  if (grade === "F") return "bg-yellow-300 font-semibold text-red-800 dark:bg-yellow-900/60 dark:text-yellow-100";
  return "bg-neutral-50 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400";
}

/** Row 35/36 threshold labels (same for every analyte block). */
function parseColumnLabels(reportCard: Record<string, unknown>): ReportCardColumnLabels {
  return {
    rsd: strField(reportCard, "rsdThresholdLabel", "rsdColumnLabel") ?? "RSD",
    r: strField(reportCard, "correlationRThresholdLabel", "rThresholdLabel", "rColumnLabel") ?? "r",
    cod: strField(reportCard, "codThresholdLabel", "codColumnLabel") ?? "COD",
  };
}

export function buildReportCardTables(reportCard: Record<string, unknown> | undefined, thresholds?: MethodGradeThresholds): ReportCardAnalyteTable[] {
  if (!reportCard) return [];

  const gradeThresholds: MethodGradeThresholds = {
    minCorrelation: thresholds?.minCorrelation ?? 0.995,
    minCod: thresholds?.minCod ?? 0.900025,
  };

  const analyteBlocks =
    Array.isArray(reportCard.analytes) && reportCard.analytes.length ? collectAnalyteCentric(reportCard) : collectVariantCentric(reportCard);

  const byAnalyte = new Map(analyteBlocks.map((e) => [e.analyteId, e]));
  applyAnalyteRecommendations(byAnalyte, reportCard);

  const selectedByAnalyte = selectionKeys(reportCard);
  const columnLabels = parseColumnLabels(reportCard);

  return [...byAnalyte.values()].map((entry) => {
    const draftRows: ReportCardModelRow[] = REPORT_CARD_MODEL_ORDER.map((model) => {
      const slot = entry.byVariant.get(model.key);
      const analyte = slot?.analyte ?? null;
      const parsed = metricsFromApi(slot?.raw ?? null, analyte, gradeThresholds);
      return {
        key: model.key,
        regressionType: model.regressionType,
        weightingMode: model.weightingMode,
        excelLabel: slot?.modelLabel ?? model.excelLabel,
        rowClass: model.rowClass,
        analyte,
        metrics: parsed.metrics,
      };
    });

    const rows = applySelections(applyClientFallbacks(draftRows), selectedByAnalyte);
    const hasFullDvdMetrics = rows.some(
      (r) => r.metrics.fromApi && r.metrics.pointTotal != null && r.metrics.overallExtrapolationRank != null && r.metrics.icvRank != null,
    );

    const base = {
      analyteId: entry.analyteId,
      analyteName: entry.analyteName,
      rows,
      columnLabels,
      hasFullDvdMetrics,
    };

    return { ...base, ...resolveBestKeys(base, entry) };
  });
}
