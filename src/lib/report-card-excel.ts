import {
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
  missedPointCount: number | null;
  icvPassed: boolean | null;
  isSelected: boolean;
}>;

/** DVD ranking + grade columns for one model row. */
export type ReportCardModelMetrics = Readonly<{
  rsdGrade: string;
  rGrade: string;
  codGrade: string;
  refittingGreaterThanMinus20PeRank: number | null;
  refittingLessThanPlus20PeRank: number | null;
  refittingTotalRank: number | null;
  zeroAreaRank: number | null;
  cal125PercentRank: number | null;
  cal25PercentRank: number | null;
  cal50PercentRank: number | null;
  cal75PercentRank: number | null;
  overallExtrapolationRank: number | null;
  negativeAreaRank: number | null;
  icvRank: number | null;
  pointTotal: number | null;
  pointTotalRank: number | null;
  pointTotalWithoutForcedZeroRank: number | null;
  pointTotalWithForcedZeroRank: number | null;
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

export type ReportCardAnalyteTable = Readonly<{
  analyteId: string;
  analyteName: string;
  rows: ReportCardModelRow[];
  bestOverallKey: string | null;
  bestNonForcedZeroKey: string | null;
  hasFullDvdMetrics: boolean;
}>;

export type MethodGradeThresholds = Readonly<{
  minCorrelation: number;
  maxRSE: number;
  labelMode?: "RSquared" | "CorrelationCoefficient" | string;
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

function parseRankingBreakdown(raw: Record<string, unknown>): {
  metrics: Partial<ReportCardModelMetrics>;
  refittingCounts: { below: number | null; above: number | null; total: number | null } | null;
} {
  const metrics: Partial<ReportCardModelMetrics> = {
    pointTotal: numField(raw, "pointTotal", "pointTotalScore"),
    pointTotalRank: numField(raw, "modelRank", "pointTotalRank", "pointTotalRanking"),
  };

  const breakdown = raw.rankingBreakdown;
  if (typeof breakdown !== "object" || breakdown === null) {
    return { metrics, refittingCounts: null };
  }

  const b = breakdown as Record<string, unknown>;
  const probes = Array.isArray(b.probeDeviationRanks) ? b.probeDeviationRanks : [];
  const probeRank = (index: number): number | null =>
    typeof probes[index] === "number" && Number.isFinite(probes[index]) ? (probes[index] as number) : null;

  return {
    metrics: {
      ...metrics,
      zeroAreaRank: probeRank(0) ?? numField(b, "zeroAreaRank", "extrapolationZeroRank"),
      cal125PercentRank: probeRank(1) ?? numField(b, "cal125PercentRank", "extrapolation125PercentRank"),
      cal25PercentRank: probeRank(2) ?? numField(b, "cal25PercentRank", "extrapolation25PercentRank"),
      cal50PercentRank: probeRank(3) ?? numField(b, "cal50PercentRank", "extrapolation50PercentRank"),
      cal75PercentRank: probeRank(4) ?? numField(b, "cal75PercentRank", "extrapolation75PercentRank"),
      overallExtrapolationRank: numField(b, "overallDeviationRank", "overallExtrapolationRank"),
      negativeAreaRank: numField(b, "negativeAreaRank"),
      icvRank: numField(b, "icvRank"),
    },
    refittingCounts: {
      below: numField(b, "pointsBelowLowerBound"),
      above: numField(b, "pointsAboveUpperBound"),
      total: numField(b, "failTotalDoubleCounted"),
    },
  };
}

function parseApiMetrics(raw: Record<string, unknown>): Partial<ReportCardModelMetrics> & {
  refittingCounts: { below: number | null; above: number | null; total: number | null } | null;
} {
  const fromBreakdown = parseRankingBreakdown(raw);
  const legacy = {
    rsdGrade: strField(raw, "rsdGrade", "rsdLetterGrade", "rsdLetter") ?? undefined,
    rGrade: strField(raw, "rGrade", "correlationGrade", "rLetterGrade", "rLetter") ?? undefined,
    codGrade: strField(raw, "codGrade", "codLetterGrade", "rSquaredGrade", "codLetter") ?? undefined,
    refittingGreaterThanMinus20PeRank: numField(
      raw,
      "refittingGreaterThanMinus20PeRank",
      "refittingPeGreaterThanMinus20Rank",
      "refittingGreaterThanMinus20PercentRank",
    ),
    refittingLessThanPlus20PeRank: numField(
      raw,
      "refittingLessThanPlus20PeRank",
      "refittingPeLessThanPlus20Rank",
      "refittingLessThanPlus20PercentRank",
    ),
    refittingTotalRank: numField(raw, "refittingTotalRank", "refittingPeTotalRank", "refittingRank"),
    zeroAreaRank: numField(raw, "zeroAreaRank", "extrapolationZeroRank", "zeroRank"),
    cal125PercentRank: numField(
      raw,
      "cal125PercentRank",
      "cal12Point5PercentRank",
      "extrapolation125PercentRank",
      "extrapolation12Point5PercentRank",
    ),
    cal25PercentRank: numField(raw, "cal25PercentRank", "extrapolation25PercentRank"),
    cal50PercentRank: numField(raw, "cal50PercentRank", "extrapolation50PercentRank"),
    cal75PercentRank: numField(raw, "cal75PercentRank", "extrapolation75PercentRank"),
    overallExtrapolationRank: numField(raw, "overallExtrapolationRank", "extrapolationOverallRank"),
    negativeAreaRank: numField(raw, "negativeAreaRank", "extrapolatedNegativeAreaRank"),
    icvRank: numField(raw, "icvRank", "icvRanking"),
    pointTotalWithoutForcedZeroRank: numField(
      raw,
      "pointTotalWithoutForcedZeroRank",
      "pointTotalExcludingForcedZeroRank",
      "pointTotalWithoutForcedZeroModelsRank",
    ),
    pointTotalWithForcedZeroRank: numField(
      raw,
      "pointTotalWithForcedZeroRank",
      "pointTotalIncludingForcedZeroRank",
      "pointTotalWithForcedZeroModelsRank",
    ),
  };

  return {
    ...legacy,
    ...fromBreakdown.metrics,
    refittingCounts: fromBreakdown.refittingCounts,
  };
}

function metricsFromApi(
  raw: Record<string, unknown> | null,
  analyte: ReportCardAnalyteRow | null,
  thresholds: MethodGradeThresholds,
): { metrics: ReportCardModelMetrics; refittingCounts: { below: number | null; above: number | null; total: number | null } | null } {
  const api = raw ? parseApiMetrics(raw) : { refittingCounts: null as null };
  const { refittingCounts, ...metricFields } = api;
  const minCorr = thresholds.minCorrelation;
  const maxRse = thresholds.maxRSE;

  const fromApi = Boolean(
    metricFields.pointTotal != null ||
      metricFields.pointTotalRank != null ||
      metricFields.overallExtrapolationRank != null ||
      metricFields.icvRank != null ||
      refittingCounts != null ||
      metricFields.rsdGrade,
  );

  return {
    refittingCounts,
    metrics: {
      rsdGrade: metricFields.rsdGrade ?? fitGrade(analyte?.rse ?? null, maxRse, false),
      rGrade: metricFields.rGrade ?? fitGrade(analyte?.correlationR ?? null, minCorr, true),
      codGrade: metricFields.codGrade ?? fitGrade(analyte?.rSquared ?? null, minCorr, true),
      refittingGreaterThanMinus20PeRank: metricFields.refittingGreaterThanMinus20PeRank ?? null,
      refittingLessThanPlus20PeRank: metricFields.refittingLessThanPlus20PeRank ?? null,
      refittingTotalRank: metricFields.refittingTotalRank ?? null,
      zeroAreaRank: metricFields.zeroAreaRank ?? null,
      cal125PercentRank: metricFields.cal125PercentRank ?? null,
      cal25PercentRank: metricFields.cal25PercentRank ?? null,
      cal50PercentRank: metricFields.cal50PercentRank ?? null,
      cal75PercentRank: metricFields.cal75PercentRank ?? null,
      overallExtrapolationRank: metricFields.overallExtrapolationRank ?? null,
      negativeAreaRank: metricFields.negativeAreaRank ?? null,
      icvRank: metricFields.icvRank ?? null,
      pointTotal: metricFields.pointTotal ?? null,
      pointTotalRank: metricFields.pointTotalRank ?? null,
      pointTotalWithoutForcedZeroRank: metricFields.pointTotalWithoutForcedZeroRank ?? null,
      pointTotalWithForcedZeroRank: metricFields.pointTotalWithForcedZeroRank ?? null,
      fromApi,
    },
  };
}

type RefittingCounts = Readonly<{ below: number | null; above: number | null; total: number | null }>;

function applyClientRankFallbacks(
  rows: ReportCardModelRow[],
  refittingByKey: Map<string, RefittingCounts>,
): ReportCardModelRow[] {
  const belowRank = rankDense(
    rows.map((r) => ({ key: r.key, value: refittingByKey.get(r.key)?.below ?? null })),
    true,
  );
  const aboveRank = rankDense(
    rows.map((r) => ({ key: r.key, value: refittingByKey.get(r.key)?.above ?? null })),
    true,
  );
  const totalRank = rankDense(
    rows.map((r) => ({ key: r.key, value: refittingByKey.get(r.key)?.total ?? null })),
    true,
  );

  const needsIcv = rows.some((r) => r.metrics.icvRank == null && r.analyte?.icvPassed != null);
  const needsMissed = rows.some((r) => r.metrics.refittingTotalRank == null && r.analyte?.missedPointCount != null);

  const icvRank = needsIcv
    ? rankDense(
        rows.map((r) => ({
          key: r.key,
          value: r.analyte?.icvPassed == null ? null : r.analyte.icvPassed ? 1 : 9,
        })),
        true,
      )
    : new Map<string, number>();

  const missedRank = needsMissed
    ? rankDense(rows.map((r) => ({ key: r.key, value: r.analyte?.missedPointCount ?? null })), true)
    : new Map<string, number>();

  const withRanks = rows.map((r) => {
    const m = r.metrics;
    const icvRankVal = m.icvRank ?? icvRank.get(r.key) ?? null;
    const refittingTotal =
      m.refittingTotalRank ?? totalRank.get(r.key) ?? missedRank.get(r.key) ?? null;
    const pointTotal = m.pointTotal ?? null;
    return {
      ...r,
      metrics: {
        ...m,
        icvRank: icvRankVal,
        refittingGreaterThanMinus20PeRank:
          m.refittingGreaterThanMinus20PeRank ?? belowRank.get(r.key) ?? null,
        refittingLessThanPlus20PeRank: m.refittingLessThanPlus20PeRank ?? aboveRank.get(r.key) ?? null,
        refittingTotalRank: refittingTotal,
        pointTotal,
        pointTotalRank: m.pointTotalRank,
      },
    };
  });

  const hasPointTotalRank = withRanks.some((r) => r.metrics.pointTotalRank != null);
  const ptRank = hasPointTotalRank
    ? null
    : rankDense(
        withRanks.map((row) => ({ key: row.key, value: row.metrics.pointTotal })),
        true,
      );
  const ranked = withRanks.map((r) => ({
    ...r,
    metrics: {
      ...r.metrics,
      pointTotalRank: r.metrics.pointTotalRank ?? ptRank?.get(r.key) ?? null,
    },
  }));

  const nonForced = ranked.filter((r) => !MODEL_BY_KEY.get(r.key)?.forcedZero && r.metrics.pointTotal != null);
  const forced = ranked.filter((r) => MODEL_BY_KEY.get(r.key)?.forcedZero && r.metrics.pointTotal != null);
  const nonForcedRank = rankDense(
    nonForced.map((r) => ({ key: r.key, value: r.metrics.pointTotal })),
    true,
  );
  const forcedRank = rankDense(
    forced.map((r) => ({ key: r.key, value: r.metrics.pointTotal })),
    true,
  );

  return ranked.map((r) => ({
    ...r,
    metrics: {
      ...r.metrics,
      pointTotalWithoutForcedZeroRank:
        r.metrics.pointTotalWithoutForcedZeroRank ??
        (MODEL_BY_KEY.get(r.key)?.forcedZero ? null : nonForcedRank.get(r.key) ?? null),
      pointTotalWithForcedZeroRank:
        r.metrics.pointTotalWithForcedZeroRank ?? forcedRank.get(r.key) ?? null,
    },
  }));
}

function recommendationKeys(raw: Record<string, unknown>): {
  bestOverallKey: string | null;
  bestNonForcedZeroKey: string | null;
} {
  const rt = normalizeRegressionType(raw.recommendedRegressionType);
  const wm = normalizeWeightingMode(raw.recommendedWeightingMode);
  const nfRt = normalizeRegressionType(raw.nonForcedZeroRegressionType);
  const nfWm = normalizeWeightingMode(raw.nonForcedZeroWeightingMode);
  return {
    bestOverallKey: rt && wm ? variantKey(rt, wm) : null,
    bestNonForcedZeroKey: nfRt && nfWm ? variantKey(nfRt, nfWm) : null,
  };
}

function applyAnalyteRecommendations(
  byAnalyte: Map<string, AnalyteBuild>,
  reportCard: Record<string, unknown>,
): void {
  const recommendations = Array.isArray(reportCard.analyteRecommendations)
    ? reportCard.analyteRecommendations
    : [];
  for (const raw of recommendations) {
    if (typeof raw !== "object" || raw === null) continue;
    const rec = raw as Record<string, unknown>;
    const analyteId = typeof rec.analyteId === "string" ? rec.analyteId : "";
    if (!analyteId) continue;
    const entry = byAnalyte.get(analyteId);
    if (!entry) continue;
    const keys = recommendationKeys(rec);
    if (keys.bestOverallKey) entry.bestOverallKey = keys.bestOverallKey;
    if (keys.bestNonForcedZeroKey) entry.bestNonForcedZeroKey = keys.bestNonForcedZeroKey;
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
    return isSelected === row.analyte.isSelected
      ? row
      : { ...row, analyte: { ...row.analyte, isSelected } };
  });
}

type AnalyteBuild = {
  analyteId: string;
  analyteName: string;
  byVariant: Map<string, { analyte: ReportCardAnalyteRow | null; raw: Record<string, unknown> | null }>;
  bestOverallKey: string | null;
  bestNonForcedZeroKey: string | null;
};

function collectAnalyteCentric(reportCard: Record<string, unknown>): AnalyteBuild[] {
  const topAnalytes = Array.isArray(reportCard.analytes) ? reportCard.analytes : [];
  return topAnalytes
    .map((rawA) => {
      if (typeof rawA !== "object" || rawA === null) return null;
      const block = rawA as Record<string, unknown>;
      const analyteId = typeof block.analyteId === "string" ? block.analyteId : "";
      if (!analyteId) return null;
      const analyteName = typeof block.analyteName === "string" ? block.analyteName : analyteId;
      const byVariant = new Map<string, { analyte: ReportCardAnalyteRow | null; raw: Record<string, unknown> | null }>();

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
        byVariant.set(key, {
          analyte: parseAnalyte(row, analyteId, analyteName),
          raw: row,
        });
      }

      return {
        analyteId,
        analyteName,
        byVariant,
        bestOverallKey:
          bestModelKey(block.bestOverallRankedModel) ??
          bestModelKey(block.bestOverallModel) ??
          bestModelKey(block.suggestedModel),
        bestNonForcedZeroKey:
          bestModelKey(block.bestRankedNonForcedZeroModel) ??
          bestModelKey(block.bestNonForcedZeroModel),
      } satisfies AnalyteBuild;
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
    const analytes = Array.isArray(v.analytes) ? v.analytes : [];
    for (const rawA of analytes) {
      const analyte = parseAnalyte(rawA);
      if (!analyte) continue;
      let entry = byAnalyte.get(analyte.analyteId);
      if (!entry) {
        entry = {
          analyteId: analyte.analyteId,
          analyteName: analyte.analyteName,
          byVariant: new Map(),
          bestOverallKey: null,
          bestNonForcedZeroKey: null,
        };
        byAnalyte.set(analyte.analyteId, entry);
      }
      entry.byVariant.set(key, {
        analyte,
        raw: typeof rawA === "object" && rawA !== null ? (rawA as Record<string, unknown>) : null,
      });
      if (typeof rawA === "object" && rawA !== null) {
        const row = rawA as Record<string, unknown>;
        if (row.isRecommendedModel === true) entry.bestOverallKey = key;
        if (row.isRecommendedNonForcedZeroModel === true) entry.bestNonForcedZeroKey = key;
      }
    }
  }

  applyAnalyteRecommendations(byAnalyte, reportCard);

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
): Pick<ReportCardAnalyteTable, "bestOverallKey" | "bestNonForcedZeroKey"> {
  if (entry.bestOverallKey || entry.bestNonForcedZeroKey) {
    return {
      bestOverallKey: entry.bestOverallKey,
      bestNonForcedZeroKey: entry.bestNonForcedZeroKey,
    };
  }
  const scored = table.rows.filter((r) => r.metrics.pointTotal != null);
  const bestOverallKey =
    scored.length === 0
      ? null
      : [...scored].sort((a, b) => (a.metrics.pointTotal! - b.metrics.pointTotal!))[0]?.key ?? null;
  const nonForced = scored.filter((r) => !MODEL_BY_KEY.get(r.key)?.forcedZero);
  const bestNonForcedZeroKey =
    nonForced.length === 0
      ? null
      : [...nonForced].sort((a, b) => (a.metrics.pointTotal! - b.metrics.pointTotal!))[0]?.key ?? null;
  return { bestOverallKey, bestNonForcedZeroKey };
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

export function buildReportCardTables(
  reportCard: Record<string, unknown> | undefined,
  thresholds?: MethodGradeThresholds,
): ReportCardAnalyteTable[] {
  if (!reportCard) return [];

  const gradeThresholds: MethodGradeThresholds = {
    minCorrelation: thresholds?.minCorrelation ?? 0.99,
    maxRSE: thresholds?.maxRSE ?? 15,
    labelMode: thresholds?.labelMode,
  };

  const analyteBlocks =
    Array.isArray(reportCard.analytes) && reportCard.analytes.length
      ? collectAnalyteCentric(reportCard)
      : collectVariantCentric(reportCard);

  const selectedByAnalyte = selectionKeys(reportCard);

  return analyteBlocks.map((entry) => {
    const refittingByKey = new Map<string, RefittingCounts>();
    const draftRows: ReportCardModelRow[] = REPORT_CARD_MODEL_ORDER.map((model) => {
      const slot = entry.byVariant.get(model.key);
      const analyte = slot?.analyte ?? null;
      const parsed = metricsFromApi(slot?.raw ?? null, analyte, gradeThresholds);
      if (parsed.refittingCounts) refittingByKey.set(model.key, parsed.refittingCounts);
      return {
        key: model.key,
        regressionType: model.regressionType,
        weightingMode: model.weightingMode,
        excelLabel: model.excelLabel,
        rowClass: model.rowClass,
        analyte,
        metrics: parsed.metrics,
      };
    });

    const rows = applySelections(applyClientRankFallbacks(draftRows, refittingByKey), selectedByAnalyte);
    const hasFullDvdMetrics = rows.some(
      (r) =>
        r.metrics.fromApi &&
        r.metrics.pointTotal != null &&
        r.metrics.overallExtrapolationRank != null &&
        r.metrics.icvRank != null,
    );

    const base = {
      analyteId: entry.analyteId,
      analyteName: entry.analyteName,
      rows,
      hasFullDvdMetrics,
    };

    return { ...base, ...resolveBestKeys(base, entry) };
  });
}
