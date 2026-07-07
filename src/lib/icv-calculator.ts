import { REPORT_CARD_MODEL_ORDER } from "@/lib/report-card-excel";
import { variantKey } from "@/lib/regression-wire";

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
  lowerControlLimit: number | null;
  upperControlLimit: number | null;
  recoveryPassed: boolean | null;
  icvPassed: boolean | null;
  spccMinRfPassed: boolean | null;
  cccRsdPassed: boolean | null;
}>;

export function parseIcvSnapshot(raw: Record<string, unknown> | null | undefined): IcvSnapshot {
  const r = raw ?? {};
  const trueConcentration = num(getIcvField(r, "icvTrueConcentration", "IcvTrueConcentration"));
  const calculatedConcentration = num(
    getIcvField(r, "icvCalculatedConcentration", "IcvCalculatedConcentration"),
  );
  const percentDiff = num(getIcvField(r, "icvPercentDiff", "IcvPercentDiff"));
  const lowerControlLimit = num(getIcvField(r, "icvLcsLowerControlLimit", "IcvLcsLowerControlLimit"));
  const upperControlLimit = num(getIcvField(r, "icvLcsUpperControlLimit", "IcvLcsUpperControlLimit"));
  const recoveryPercent =
    trueConcentration != null && calculatedConcentration != null && trueConcentration !== 0
      ? (calculatedConcentration / trueConcentration) * 100
      : null;

  return {
    analyteName:
      typeof getIcvField(r, "analyteName", "AnalyteName") === "string"
        ? (getIcvField(r, "analyteName", "AnalyteName") as string)
        : "",
    trueConcentration,
    calculatedConcentration,
    percentDiff,
    recoveryPercent,
    lowerControlLimit,
    upperControlLimit,
    recoveryPassed: bool(getIcvField(r, "icvLcsRecoveryPassed", "IcvLcsRecoveryPassed")),
    icvPassed: bool(getIcvField(r, "icvPassed", "IcvPassed")),
    spccMinRfPassed: bool(getIcvField(r, "spccMinRfPassed", "SpccMinRfPassed")),
    cccRsdPassed: bool(getIcvField(r, "cccRsdPassed", "CccRsdPassed")),
  };
}

export type IcvInstrumentInputs = Readonly<{
  standardResponse: number | null;
  isResponse: number | null;
  responseRatio: number | null;
  amountRatio: number | null;
  responseFactor: number | null;
}>;

/** ICV measurement row from regression-debug `points` (Standard/IS response, ratios). */
export function parseIcvInstrumentInputs(curve: Record<string, unknown> | null | undefined): IcvInstrumentInputs {
  const empty = {
    standardResponse: null,
    isResponse: null,
    responseRatio: null,
    amountRatio: null,
    responseFactor: null,
  } as const;
  if (!curve) return empty;

  const trueConc = num(getIcvField(curve, "icvTrueConcentration", "IcvTrueConcentration"));
  const points = Array.isArray(curve.points) ? curve.points : [];
  let icvPoint: Record<string, unknown> | null = null;

  for (const raw of points) {
    if (typeof raw !== "object" || raw === null) continue;
    const p = raw as Record<string, unknown>;
    const sc = num(getIcvField(p, "standardConcentration", "StandardConcentration"));
    if (trueConc != null && sc != null && Math.abs(sc - trueConc) < 1e-9) {
      icvPoint = p;
      break;
    }
  }

  if (!icvPoint) {
    for (const raw of points) {
      if (typeof raw !== "object" || raw === null) continue;
      const p = raw as Record<string, unknown>;
      const runName = getIcvField(p, "sourceRunName", "SourceRunName");
      if (typeof runName === "string" && /icv/i.test(runName)) {
        icvPoint = p;
        break;
      }
    }
  }

  if (!icvPoint) return empty;

  return {
    standardResponse: num(getIcvField(icvPoint, "standardResponse", "StandardResponse")),
    isResponse: num(getIcvField(icvPoint, "isResponse", "IsResponse")),
    responseRatio: num(getIcvField(icvPoint, "responseRatio", "ResponseRatio")),
    amountRatio: num(getIcvField(icvPoint, "amountRatio", "AmountRatio")),
    responseFactor: num(getIcvField(icvPoint, "responseFactor", "ResponseFactor")),
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

/** Excel SPCC/CCC check cells show 0.000 when the criterion passed. */
export function excelCheckCell(passed: boolean | null): string {
  if (passed === true) return "0.000";
  if (passed === false) return "1.000";
  return "—";
}
