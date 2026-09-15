import { REPORT_CARD_MODEL_ORDER } from "@/lib/report-card-excel";
import { modelVariantLabel, variantKey } from "@/lib/regression-wire";

export function getIcvField(raw: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (k in raw) return raw[k];
  }
  return undefined;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function bool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

export type IcvSnapshot = Readonly<{
  analyteName: string;
  trueConcentration: number | null;
  calculatedConcentration: number | null;
  percentDiff: number | null;
  recoveryPercent: number | null;
  observedResponse: number | null;
  cdsReportedConcentration: number | null;
  cdsPercentDiff: number | null;
  lowerControlLimit: number | null;
  upperControlLimit: number | null;
  recoveryPassed: boolean | null;
  icvPassed: boolean | null;
  icvCdsPassed: boolean | null;
  spccMinRfPassed: boolean | null;
  cccRsdPassed: boolean | null;
}>;

export type IcvAdminLimits = Readonly<{
  icvLimitPercent: number | null;
  icvCdsParityPercent: number | null;
}>;

export type IcvReportContext = Readonly<{
  ldr?: Record<string, unknown> | null;
  executive?: Record<string, unknown> | null;
  admin?: Record<string, unknown> | null;
}>;

export function parseIcvAdminLimits(raw: Record<string, unknown> | null | undefined): IcvAdminLimits {
  const r = raw ?? {};
  return {
    icvLimitPercent: num(getIcvField(r, "icvLimitPercent", "IcvLimitPercent")),
    icvCdsParityPercent: num(getIcvField(r, "icvCdsParityPercent", "IcvCdsParityPercent")),
  };
}

export function parseIcvSnapshot(raw: Record<string, unknown> | null | undefined): IcvSnapshot {
  const r = raw ?? {};
  const trueConcentration = num(getIcvField(r, "icvTrueConcentration", "IcvTrueConcentration"));
  const calculatedConcentration = num(
    getIcvField(r, "icvCalculatedConcentration", "IcvCalculatedConcentration"),
  );
  const percentDiff = num(getIcvField(r, "icvPercentDiff", "IcvPercentDiff"));
  const apiRecovery = num(getIcvField(r, "icvRecoveryPercent", "IcvRecoveryPercent"));
  const recoveryPercent =
    apiRecovery ??
    (percentDiff != null ? 100 + percentDiff : null) ??
    (trueConcentration != null && calculatedConcentration != null && trueConcentration !== 0
      ? (calculatedConcentration / trueConcentration) * 100
      : null);

  return {
    analyteName:
      typeof getIcvField(r, "analyteName", "AnalyteName") === "string"
        ? (getIcvField(r, "analyteName", "AnalyteName") as string)
        : "",
    trueConcentration,
    calculatedConcentration,
    percentDiff,
    recoveryPercent,
    observedResponse: num(getIcvField(r, "icvObservedResponse", "IcvObservedResponse")),
    cdsReportedConcentration: num(
      getIcvField(r, "icvCdsReportedConcentration", "IcvCdsReportedConcentration"),
    ),
    cdsPercentDiff: num(getIcvField(r, "icvCdsPercentDiff", "IcvCdsPercentDiff")),
    lowerControlLimit: num(getIcvField(r, "icvLcsLowerControlLimit", "IcvLcsLowerControlLimit")),
    upperControlLimit: num(getIcvField(r, "icvLcsUpperControlLimit", "IcvLcsUpperControlLimit")),
    recoveryPassed: bool(getIcvField(r, "icvLcsRecoveryPassed", "IcvLcsRecoveryPassed")),
    icvPassed: bool(getIcvField(r, "icvPassed", "IcvPassed")),
    icvCdsPassed: bool(getIcvField(r, "icvCdsPassed", "IcvCdsPassed")),
    spccMinRfPassed: bool(getIcvField(r, "spccMinRfPassed", "SpccMinRfPassed")),
    cccRsdPassed: bool(getIcvField(r, "cccRsdPassed", "CccRsdPassed")),
  };
}

/** Merge summary-report LDR/executive with a regression-debug curve (report wins for ICV headline fields). */
export function mergeIcvSnapshot(
  referenceCurve: Record<string, unknown> | null | undefined,
  reportContext?: IcvReportContext | null,
): IcvSnapshot {
  const fromCurve = parseIcvSnapshot(referenceCurve);
  const ldr = reportContext?.ldr ?? null;
  const executive = reportContext?.executive ?? null;
  const fromLdr = ldr ? parseIcvSnapshot(ldr) : null;
  const fromExec = executive ? parseIcvSnapshot(executive) : null;

  const merged = { ...fromCurve };

  if (fromLdr) {
    if (fromLdr.trueConcentration != null) merged.trueConcentration = fromLdr.trueConcentration;
    if (fromLdr.calculatedConcentration != null) merged.calculatedConcentration = fromLdr.calculatedConcentration;
    if (fromLdr.percentDiff != null) merged.percentDiff = fromLdr.percentDiff;
    if (fromLdr.recoveryPercent != null) merged.recoveryPercent = fromLdr.recoveryPercent;
    if (fromLdr.observedResponse != null) merged.observedResponse = fromLdr.observedResponse;
    if (fromLdr.cdsReportedConcentration != null) merged.cdsReportedConcentration = fromLdr.cdsReportedConcentration;
    if (fromLdr.cdsPercentDiff != null) merged.cdsPercentDiff = fromLdr.cdsPercentDiff;
    if (fromLdr.lowerControlLimit != null) merged.lowerControlLimit = fromLdr.lowerControlLimit;
    if (fromLdr.upperControlLimit != null) merged.upperControlLimit = fromLdr.upperControlLimit;
    if (fromLdr.icvPassed != null) merged.icvPassed = fromLdr.icvPassed;
    if (fromLdr.icvCdsPassed != null) merged.icvCdsPassed = fromLdr.icvCdsPassed;
    if (fromLdr.analyteName) merged.analyteName = fromLdr.analyteName;
  }

  if (fromExec) {
    if (fromExec.recoveryPassed != null) merged.recoveryPassed = fromExec.recoveryPassed;
    if (fromExec.icvPassed != null && merged.icvPassed == null) merged.icvPassed = fromExec.icvPassed;
    if (fromExec.icvCdsPassed != null && merged.icvCdsPassed == null) merged.icvCdsPassed = fromExec.icvCdsPassed;
    if (fromExec.spccMinRfPassed != null) merged.spccMinRfPassed = fromExec.spccMinRfPassed;
    if (fromExec.cccRsdPassed != null) merged.cccRsdPassed = fromExec.cccRsdPassed;
    if (fromExec.analyteName && !merged.analyteName) merged.analyteName = fromExec.analyteName;
  }

  if (merged.recoveryPassed == null && referenceCurve) {
    merged.recoveryPassed = parseIcvSnapshot(referenceCurve).recoveryPassed;
  }

  return merged;
}

export function findReportAnalyteRow(
  rows: readonly Record<string, unknown>[] | null | undefined,
  analyteId: string,
): Record<string, unknown> | null {
  if (!rows?.length || !analyteId) return null;
  for (const raw of rows) {
    if (typeof raw !== "object" || raw === null) continue;
    const id = getIcvField(raw as Record<string, unknown>, "analyteId", "AnalyteId");
    if (typeof id === "string" && id === analyteId) return raw as Record<string, unknown>;
  }
  return null;
}

export function buildIcvReportContext(
  report: Record<string, unknown> | null | undefined,
  analyteId: string,
): IcvReportContext | null {
  if (!report || !analyteId) return null;
  return {
    ldr: findReportAnalyteRow(
      Array.isArray(report.linearDynamicRange) ? (report.linearDynamicRange as Record<string, unknown>[]) : [],
      analyteId,
    ),
    executive: findReportAnalyteRow(
      Array.isArray(report.executive) ? (report.executive as Record<string, unknown>[]) : [],
      analyteId,
    ),
    admin:
      typeof report.administrative === "object" && report.administrative !== null
        ? (report.administrative as Record<string, unknown>)
        : null,
  };
}

export function selectedModelLabel(executive: Record<string, unknown> | null | undefined): string | null {
  if (!executive) return null;
  const rt = getIcvField(executive, "selectedRegressionType", "SelectedRegressionType");
  const wm = getIcvField(executive, "selectedWeightingMode", "SelectedWeightingMode");
  if (rt == null && wm == null) return null;
  return modelVariantLabel(rt, wm);
}

export type IcvInstrumentInputs = Readonly<{
  standardResponse: number | null;
  isResponse: number | null;
  responseRatio: number | null;
  amountRatio: number | null;
  responseFactor: number | null;
}>;

/**
 * ICV instrument-block inputs, read directly from the curve/regression-debug response.
 * The ICV run is separate from the CAL `points[]` (which only carry calibration-level
 * measurements), so the backend reports its own area, IS response, and derived ratios as
 * scalar `icv*` fields alongside the calc-concentration block.
 */
export function parseIcvInstrumentInputs(
  curve: Record<string, unknown> | null | undefined,
  observedResponse?: number | null,
): IcvInstrumentInputs {
  const r = curve ?? {};
  return {
    standardResponse:
      observedResponse ?? num(getIcvField(r, "icvObservedResponse", "IcvObservedResponse")),
    isResponse: num(getIcvField(r, "icvInternalStandardResponse", "IcvInternalStandardResponse")),
    responseRatio: num(getIcvField(r, "icvObservedResponseRatio", "IcvObservedResponseRatio")),
    amountRatio: num(getIcvField(r, "icvAmountRatio", "IcvAmountRatio")),
    responseFactor: num(getIcvField(r, "icvResponseFactor", "IcvResponseFactor")),
  };
}

export type IcvModelRow = Readonly<{
  key: string;
  excelLabel: string;
  subLabel: string;
  rowClass: string;
  curve: Record<string, unknown> | null;
}>;

export type IcvModelGroup = Readonly<{
  id: string;
  title: string;
  formula: string;
  headerClass: string;
  rows: readonly IcvModelRow[];
}>;

const MODEL_META = new Map(
  REPORT_CARD_MODEL_ORDER.map((m) => [
    m.key,
    { excelLabel: m.excelLabel, rowClass: m.rowClass },
  ]),
);

const ICV_SUB_LABELS: Record<string, string> = {
  "Average:None": "Average RF",
  "Linear:None": "Equal Weighting",
  "Linear:InverseX": "Inverse Conct · Inverse Concentration Weighting",
  "Linear:InverseXSquared": "Inverse Sq Conct · Inverse Concentration Squared Weighting",
  "LinearForcedZero:None": "Forced Zero",
  "Quadratic:None": "Equal Weighting",
  "Quadratic:InverseX": "Inverse Conct · Inverse Concentration Weighting",
  "Quadratic:InverseXSquared": "Inverse Sq Conct · Inverse Concentration Squared Weighting",
  "QuadraticForcedZero:None": "Forced Zero",
};

const ICV_GROUP_DEFS: readonly {
  id: string;
  title: string;
  formula: string;
  headerClass: string;
  keys: readonly string[];
}[] = [
  {
    id: "average",
    title: "Average RF",
    formula: "(Resp X / Resp IS) × (Conct IS / Ave RF)",
    headerClass: "bg-blue-600 text-white",
    keys: ["Average:None"],
  },
  {
    id: "linear",
    title: "Least Squared Regression",
    formula: "(((Resp X / Resp IS) − b) / m) × Conct IS",
    headerClass: "bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100",
    keys: ["Linear:None", "Linear:InverseX", "Linear:InverseXSquared", "LinearForcedZero:None"],
  },
  {
    id: "quadratic",
    title: "Quadratic Regression",
    formula: "[[+√(b² − 4a(c − y)) − b] / 2a] × Conct IS",
    headerClass: "bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100",
    keys: ["Quadratic:None", "Quadratic:InverseX", "Quadratic:InverseXSquared", "QuadraticForcedZero:None"],
  },
];

/** Nine DVD model rows in Excel order, keyed to curves from GET …/curves. */
export function buildIcvModelRows(curves: readonly Record<string, unknown>[]): IcvModelRow[] {
  const byKey = new Map<string, Record<string, unknown>>();
  for (const curve of curves) {
    const key = variantKey(
      getIcvField(curve, "regressionType", "RegressionType"),
      getIcvField(curve, "weightingMode", "WeightingMode"),
    );
    if (key) byKey.set(key, curve);
  }
  return REPORT_CARD_MODEL_ORDER.map((model) => ({
    key: model.key,
    excelLabel: model.excelLabel,
    subLabel: ICV_SUB_LABELS[model.key] ?? model.excelLabel,
    rowClass: model.rowClass,
    curve: byKey.get(model.key) ?? null,
  }));
}

export function buildIcvModelGroups(curves: readonly Record<string, unknown>[]): IcvModelGroup[] {
  const flat = buildIcvModelRows(curves);
  const byKey = new Map(flat.map((r) => [r.key, r]));
  return ICV_GROUP_DEFS.map((g) => ({
    id: g.id,
    title: g.title,
    formula: g.formula,
    headerClass: g.headerClass,
    rows: g.keys.map((key) => {
      const row = byKey.get(key);
      const meta = MODEL_META.get(key);
      return (
        row ?? {
          key,
          excelLabel: meta?.excelLabel ?? key,
          subLabel: ICV_SUB_LABELS[key] ?? key,
          rowClass: meta?.rowClass ?? "",
          curve: null,
        }
      );
    }),
  }));
}

export function pctDiffFromReference(
  calculated: number | null,
  reference: number | null,
): number | null {
  if (calculated == null || reference == null || reference === 0) return null;
  return ((calculated - reference) / reference) * 100;
}

export function fmtIcvNum(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1000) {
    return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  return v.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function fmtIcvSci(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v !== 0 && Math.abs(v) < 0.01) return v.toExponential(3);
  return fmtIcvNum(v, 3);
}

export function icvPassLabel(passed: boolean | null): string {
  if (passed === true) return "Acceptable";
  if (passed === false) return "Unacceptable";
  return "—";
}

export function icvTriStateLabel(v: boolean | null): string {
  if (v === true) return "Pass";
  if (v === false) return "Fail";
  return "N/A";
}

/** Excel SPCC/CCC check cells show 0.000 when the criterion passed. */
export function excelCheckCell(passed: boolean | null): string {
  if (passed === true) return "0.000";
  if (passed === false) return "1.000";
  return "—";
}

export function hasIcvData(snapshot: IcvSnapshot): boolean {
  return (
    snapshot.trueConcentration != null ||
    snapshot.calculatedConcentration != null ||
    snapshot.observedResponse != null
  );
}
