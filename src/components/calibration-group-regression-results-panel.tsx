"use client";

import { CalibrationPlotlyChart } from "@/components/calibration-plotly-chart";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import {
  getCalibrationGroupChart,
  getCalibrationGroupRegressionDebug,
  getCalibrationGroupRegressionInputs,
  getCalibrationGroupReportCard,
} from "@/lib/api/wltr-api";
import {
  buildCurveQueryParams,
  hasGroupSelectedModel,
  modelVariantLabel,
  parseVariantKey,
  pickActiveVariantKey,
  resolveVariantOptions,
  variantKey,
} from "@/lib/calibration-variant-utils";
import type { MeResponse } from "@/lib/types/wltr";
import { REGRESSION_TYPE_LABEL, WEIGHTING_MODE_LABEL } from "@/lib/types/wltr";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

function cellStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function formatNum(v: unknown, digits?: number): string {
  if (v == null) return "—";
  if (typeof v === "number" && Number.isFinite(v))
    return digits != null ? v.toFixed(digits) : String(v);
  return cellStr(v) || "—";
}

type ParsedAnalyteRow = Readonly<{
  key: string;
  analyteId: string;
  analyteName: string;
  points: readonly Record<string, unknown>[];
}>;

function parseAnalyteRows(data: unknown): ParsedAnalyteRow[] {
  if (!Array.isArray(data)) return [];
  const out: ParsedAnalyteRow[] = [];
  for (let i = 0; i < data.length; i++) {
    const raw = data[i];
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const analyteId = cellStr(r.analyteId);
    const key = analyteId || `__idx_${i}`;
    const analyteName = cellStr(r.analyteName) || "(unnamed analyte)";
    const points = Array.isArray(r.points)
      ? r.points.filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
      : [];
    out.push({ key, analyteId, analyteName, points });
  }
  return out;
}

function getDebugField(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (k in obj) return obj[k];
  }
  return undefined;
}

function summarizePointsFromInputs(points: readonly Record<string, unknown>[]) {
  let includedCt = 0;
  let withPred = 0;
  let maxAbsPct: number | null = null;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (Boolean(p.isIncluded)) includedCt++;

    const pred = p.predictedY ?? p.predictedYValue;
    if (typeof pred === "number" && Number.isFinite(pred)) withPred++;

    const pdRaw = p.percentDiff ?? p.percentDifference;
    if (typeof pdRaw === "number" && Number.isFinite(pdRaw)) {
      const ax = Math.abs(pdRaw);
      maxAbsPct = maxAbsPct == null ? ax : Math.max(maxAbsPct, ax);
    }
  }

  return {
    totalPoints: points.length,
    includedPoints: includedCt,
    pointsWithPredictedY: withPred,
    maxAbsPercentDiff: maxAbsPct,
  };
}

/** Two-column metric table forcurve-level regression output. */
function MetricsTable({
  rows,
}: Readonly<{ rows: Readonly<{ label: string; value: string }>[] }>) {
  if (!rows.length) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50">
            <th className="whitespace-nowrap px-3 py-2 font-medium text-neutral-700 dark:text-neutral-300">
              Metric
            </th>
            <th className="whitespace-nowrap px-3 py-2 font-medium text-neutral-700 dark:text-neutral-300">
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.label}
              className="border-b border-neutral-100 last:border-b-0 dark:border-neutral-900"
            >
              <td className="whitespace-nowrap px-3 py-2 text-neutral-600 dark:text-neutral-400">{r.label}</td>
              <td className="px-3 py-2 font-mono text-[11px] text-neutral-900 dark:text-neutral-100">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function regressionTypeLabel(v: unknown): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return cellStr(v) || "—";
  return REGRESSION_TYPE_LABEL[v] ?? String(v);
}

function weightingLabel(v: unknown): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return cellStr(v) || "—";
  return WEIGHTING_MODE_LABEL[v] ?? String(v);
}

function calStatusLabel(v: unknown): string {
  if (typeof v !== "number") return cellStr(v) || "—";
  if (v === 1) return "Pass";
  if (v === 0) return "Fail";
  return String(v);
}

function boolLabel(v: unknown): string {
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return cellStr(v) || "—";
}

function failureReasonsCell(v: unknown): string {
  if (Array.isArray(v)) return v.map((x) => cellStr(x)).filter(Boolean).join("; ") || "—";
  return cellStr(v) || "—";
}

export function CalibrationGroupRegressionResultsPanel({
  groupId,
  me,
  canSummarizeFromDebug,
  selectedRegressionType,
  selectedWeightingMode,
}: Readonly<{
  groupId: string;
  me: MeResponse | null | undefined;
  canSummarizeFromDebug: boolean;
  selectedRegressionType?: number | null;
  selectedWeightingMode?: number | null;
}>) {
  const labInJwt = me?.laboratoryId;
  const [laboratoryIdOverride, setLaboratoryIdOverride] = useState("");
  const [userPickedKey, setUserPickedKey] = useState<string | null>(null);
  const [userPickedVariantKey, setUserPickedVariantKey] = useState<string | null>(null);
  const needPlatformLab = !labInJwt;

  const effectiveLaboratoryId = labInJwt || laboratoryIdOverride.trim() || undefined;

  const platformParams = useMemo(
    () => (effectiveLaboratoryId ? { laboratoryId: effectiveLaboratoryId } : undefined),
    [effectiveLaboratoryId],
  );

  const groupSelectedModel = hasGroupSelectedModel({
    regressionType: selectedRegressionType ?? null,
    weightingMode: selectedWeightingMode ?? null,
  });

  const listParams = useMemo(
    () => buildCurveQueryParams(platformParams, { groupSelectedModel, activeVariant: null }),
    [platformParams, groupSelectedModel],
  );

  const analyteListQ = useQuery({
    queryKey: ["calibration-group-regression-inputs", groupId, effectiveLaboratoryId ?? "", "__list", listParams.regressionType ?? "", listParams.weightingMode ?? ""],
    queryFn: () => getCalibrationGroupRegressionInputs(groupId, listParams),
    enabled: !!groupId && (!needPlatformLab || !!laboratoryIdOverride.trim()),
  });

  const reportCardQ = useQuery({
    queryKey: ["calibration-group-report-card", groupId, effectiveLaboratoryId ?? ""],
    queryFn: () => getCalibrationGroupReportCard(groupId, platformParams),
    enabled: !!groupId && (!needPlatformLab || !!laboratoryIdOverride.trim()),
    retry: false,
  });

  const tableRowsForPicker = useMemo(() => parseAnalyteRows(analyteListQ.data), [analyteListQ.data]);

  const hasComputedOutputs = useMemo(() => {
    for (let i = 0; i < tableRowsForPicker.length; i++) {
      const points = tableRowsForPicker[i].points;
      for (let j = 0; j < points.length; j++) {
        const p = points[j];
        if (p.predictedY != null || p.predictedYValue != null) return true;
      }
    }
    return false;
  }, [tableRowsForPicker]);

  useEffect(() => {
    setUserPickedKey(null);
    setUserPickedVariantKey(null);
  }, [groupId]);

  const effectiveKey = useMemo(() => {
    if (!tableRowsForPicker.length) return "";
    if (userPickedKey && tableRowsForPicker.some((t) => t.key === userPickedKey)) return userPickedKey;
    return tableRowsForPicker[0].key;
  }, [tableRowsForPicker, userPickedKey]);

  const selected = tableRowsForPicker.find((t) => t.key === effectiveKey) ?? null;

  const { variants: variantOptions, fromReportCard } = useMemo(
    () =>
      resolveVariantOptions(reportCardQ.data as Record<string, unknown> | undefined, selected?.analyteId ?? "", {
        allowFallback: !groupSelectedModel || hasComputedOutputs,
      }),
    [reportCardQ.data, selected?.analyteId, hasComputedOutputs, groupSelectedModel],
  );

  useEffect(() => setUserPickedVariantKey(null), [selected?.analyteId]);

  const effectiveVariantKey = useMemo(
    () =>
      pickActiveVariantKey(variantOptions, {
        userPickedKey: userPickedVariantKey,
        preferred: {
          regressionType: selectedRegressionType ?? null,
          weightingMode: selectedWeightingMode ?? null,
        },
      }),
    [variantOptions, userPickedVariantKey, selectedRegressionType, selectedWeightingMode],
  );

  const activeVariant = parseVariantKey(effectiveVariantKey);

  const curveParams = useMemo(
    () => buildCurveQueryParams(platformParams, { groupSelectedModel, activeVariant }),
    [platformParams, groupSelectedModel, activeVariant],
  );

  const inputsQ = useQuery({
    queryKey: [
      "calibration-group-regression-inputs",
      groupId,
      effectiveLaboratoryId ?? "",
      curveParams.regressionType ?? "",
      curveParams.weightingMode ?? "",
    ],
    queryFn: () => getCalibrationGroupRegressionInputs(groupId, curveParams),
    enabled: !!groupId && (!needPlatformLab || !!laboratoryIdOverride.trim()),
  });

  const tableRows = useMemo(() => parseAnalyteRows(inputsQ.data), [inputsQ.data]);
  const selectedForDisplay = tableRows.find((t) => t.key === effectiveKey) ?? selected;

  const canFetchPlatforms = !needPlatformLab || !!laboratoryIdOverride.trim();
  const canFetchChart =
    !!groupId && !!selected?.analyteId && (!needPlatformLab || !!laboratoryIdOverride.trim());

  const chartQ = useQuery({
    queryKey: [
      "calibration-group-chart",
      groupId,
      selected?.analyteId ?? "",
      effectiveLaboratoryId ?? "",
      curveParams.regressionType ?? "",
      curveParams.weightingMode ?? "",
    ],
    queryFn: () => getCalibrationGroupChart(groupId, selected!.analyteId, curveParams),
    enabled: canFetchChart,
  });

  const debugQ = useQuery({
    queryKey: [
      "calibration-group-regression-debug",
      groupId,
      selected?.analyteId ?? "",
      effectiveLaboratoryId ?? "",
      curveParams.regressionType ?? "",
      curveParams.weightingMode ?? "",
    ],
    queryFn: () => getCalibrationGroupRegressionDebug(groupId, selected!.analyteId, curveParams),
    enabled: canSummarizeFromDebug && canFetchChart,
  });

  const summaryFromInputs = useMemo(
    () => (selectedForDisplay ? summarizePointsFromInputs(selectedForDisplay.points) : null),
    [selectedForDisplay],
  );

  const debugMetricsRows = useMemo(() => {
    if (!canSummarizeFromDebug || !debugQ.data || typeof debugQ.data !== "object") return [];
    const d = debugQ.data as Record<string, unknown>;
    const rows: { label: string; value: string }[] = [];

    const push = (label: string, value: string) => rows.push({ label, value });

    push("Regression type", regressionTypeLabel(getDebugField(d, "regressionType", "RegressionType")));
    push("Weighting", weightingLabel(getDebugField(d, "weightingMode", "WeightingMode")));
    push("Forced through zero", boolLabel(getDebugField(d, "forcedZero", "ForcedZero")));
    push("Slope", formatNum(getDebugField(d, "slope", "Slope"), 6));
    push("Intercept", formatNum(getDebugField(d, "intercept", "Intercept"), 6));
    const q = getDebugField(d, "quadraticCoefficient", "QuadraticCoefficient");
    if (q != null && String(q) !== "") push("Quadratic term", formatNum(q, 8));
    push("R²", formatNum(getDebugField(d, "rSquared", "RSquared"), 6));
    push("Correlation r", formatNum(getDebugField(d, "correlationR", "CorrelationR"), 6));
    push("SSE", formatNum(getDebugField(d, "sse", "Sse")));
    push("SST", formatNum(getDebugField(d, "sst", "Sst")));
    push("RSE", formatNum(getDebugField(d, "rse", "Rse"), 6));
    push("Fit quality (value)", formatNum(getDebugField(d, "fitQualityValue", "FitQualityValue"), 6));
    push(
      "Fit quality (label)",
      cellStr(getDebugField(d, "fitQualityLabel", "FitQualityLabel")) || "—",
    );
    push("Points included", cellStr(getDebugField(d, "includedPointCount", "IncludedPointCount")) || "—");
    push("Points excluded", cellStr(getDebugField(d, "excludedPointCount", "ExcludedPointCount")) || "—");
    push("Calibration status", calStatusLabel(getDebugField(d, "calStatus", "CalStatus")));
    push("ICV true conc.", formatNum(getDebugField(d, "icvTrueConcentration", "IcvTrueConcentration"), 4));
    push(
      "ICV calculated conc.",
      formatNum(getDebugField(d, "icvCalculatedConcentration", "IcvCalculatedConcentration"), 4),
    );
    push("ICV % diff", formatNum(getDebugField(d, "icvPercentDiff", "IcvPercentDiff"), 4));
    push("ICV passed", boolLabel(getDebugField(d, "icvPassed", "IcvPassed")));
    push("Failure reasons", failureReasonsCell(getDebugField(d, "failureReasons", "FailureReasons")));

    return rows;
  }, [canSummarizeFromDebug, debugQ.data]);

  const fallbackSummaryRows = useMemo(() => {
    if (!summaryFromInputs) return [];
    const { totalPoints, includedPoints, pointsWithPredictedY, maxAbsPercentDiff } = summaryFromInputs;
    return [
      { label: "Total points", value: String(totalPoints) },
      { label: "Included (from inputs)", value: String(includedPoints) },
      { label: "Points with ŷ (from inputs)", value: String(pointsWithPredictedY) },
      {
        label: "Max |% diff| (from inputs)",
        value: maxAbsPercentDiff != null ? formatNum(maxAbsPercentDiff, 4) : "—",
      },
    ];
  }, [summaryFromInputs]);

  return (
    <Card className="overflow-hidden p-0 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04]">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-sky-50 to-white px-5 py-4 dark:border-neutral-800 dark:from-sky-950/40 dark:to-neutral-950">
        <div className="flex gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-200/90 bg-gradient-to-br from-sky-100 via-sky-50 to-white text-[11px] font-bold tracking-tight text-sky-950 shadow-sm dark:border-sky-800/70 dark:from-sky-950 dark:via-sky-900/50 dark:to-neutral-950 dark:text-sky-100 dark:shadow-none"
            aria-hidden
          >
            Fit
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Regression results
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              Curve summary and Plotly chart from{" "}
              <code className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-neutral-800">
                GET …/chart
              </code>{" "}
              (
              <code className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-neutral-800">
                perm.view
              </code>
              ). Full metric table needs{" "}
              <code className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-neutral-800">
                perm.groups.approve
              </code>
              .
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {needPlatformLab ? (
          <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-700 dark:bg-neutral-900/30">
            <Label htmlFor="rrLab">Laboratory ID</Label>
            <p className="mb-2 text-[11px] text-neutral-500 dark:text-neutral-400">
              Required for platform operators to load chart and QA metrics.
            </p>
            <Input
              id="rrLab"
              className="mt-1 max-w-md"
              value={laboratoryIdOverride}
              onChange={(e) => setLaboratoryIdOverride(e.target.value)}
              placeholder="UUID"
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-4">
          {tableRowsForPicker.length > 0 ? (
            <div className="min-w-[14rem] flex-1">
              <Label htmlFor="regressionResultsAnalyte">Analyte</Label>
              <Select
                id="regressionResultsAnalyte"
                className="mt-1"
                value={effectiveKey}
                disabled={analyteListQ.isLoading}
                onChange={(e) => setUserPickedKey(e.target.value)}
              >
                {tableRowsForPicker.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.analyteName}
                    {t.analyteId ? ` · ${t.analyteId.slice(0, 8)}…` : ""} ({t.points.length} pt
                    {t.points.length === 1 ? "" : "s"})
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          {variantOptions.length > 0 && selected?.analyteId ? (
            <div className="min-w-[14rem] flex-1">
              <Label htmlFor="regressionResultsVariant">Model variant</Label>
              <Select
                id="regressionResultsVariant"
                className="mt-1"
                value={effectiveVariantKey}
                onChange={(e) => setUserPickedVariantKey(e.target.value || null)}
              >
                {groupSelectedModel ? (
                  <option value="">Default (group-selected curve)</option>
                ) : null}
                {variantOptions.map((v) => {
                  const key = variantKey(v.regressionType, v.weightingMode);
                  const score =
                    typeof v.passCount === "number"
                      ? `${v.passCount} passes`
                      : typeof v.reportCardScore === "number"
                        ? `score ${v.reportCardScore}`
                        : "";
                  return (
                    <option key={key} value={key}>
                      {modelVariantLabel(v.regressionType, v.weightingMode)}
                      {score ? ` · ${score}` : ""}
                    </option>
                  );
                })}
              </Select>
              {!fromReportCard && reportCardQ.isError ? (
                <p className="mt-1 text-[11px] text-neutral-500">
                  Report card unavailable — showing all standard variant filters for debugging.
                </p>
              ) : null}
            </div>
          ) : !hasComputedOutputs && selected?.analyteId ? (
            <p className="text-xs text-neutral-500">Run compute to compare regression variants.</p>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            disabled={!groupId || inputsQ.isFetching}
            onClick={() => void inputsQ.refetch()}
          >
            Refresh inputs
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!canFetchPlatforms || chartQ.isFetching || !selected?.analyteId}
            onClick={() => void chartQ.refetch()}
          >
            Refresh chart
          </Button>
          {canSummarizeFromDebug ? (
            <Button
              type="button"
              variant="secondary"
              disabled={!canFetchPlatforms || debugQ.isFetching || !selected?.analyteId}
              onClick={() => void debugQ.refetch()}
            >
              Refresh metrics
            </Button>
          ) : null}
        </div>

        {inputsQ.isLoading ? <div className="text-sm text-neutral-500">Loading regression inputs…</div> : null}
        {inputsQ.isError ? (
          <div className="text-sm text-red-600">{(inputsQ.error as Error).message}</div>
        ) : null}

        {!inputsQ.isLoading && tableRows.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No analytes yet — attach CAL runs with measurements, then compute the group.
          </p>
        ) : null}

        {selected ? (
          <>
            <div>
              <h3 className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Curve summary
              </h3>
              {canSummarizeFromDebug ? (
                debugQ.isLoading ? (
                  <p className="text-xs text-neutral-500">Loading regression metrics…</p>
                ) : debugQ.isError ? (
                  <div className="space-y-2">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      Could not load full metrics (404 is normal before compute, or missing permission after compute).
                    </p>
                    <p className="text-xs text-red-600">{(debugQ.error as Error).message}</p>
                    <MetricsTable rows={fallbackSummaryRows} />
                  </div>
                ) : debugMetricsRows.length > 0 ? (
                  <MetricsTable rows={debugMetricsRows} />
                ) : (
                  <MetricsTable rows={fallbackSummaryRows} />
                )
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Full curve statistics require{" "}
                    <code className="rounded bg-neutral-100 px-1 text-[10px] dark:bg-neutral-800">
                      perm.groups.approve
                    </code>
                    . Below is a short summary derived from regression inputs after compute.
                  </p>
                  <MetricsTable rows={fallbackSummaryRows} />
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Calibration curve
                <span className="ml-2 text-xs font-normal text-neutral-500">
                  (
                  {activeVariant
                    ? modelVariantLabel(activeVariant.regressionType, activeVariant.weightingMode)
                    : groupSelectedModel
                      ? "group-selected default"
                      : "—"}
                  )
                </span>
              </h3>
              {!canFetchPlatforms ? (
                <p className="text-xs text-neutral-500">Enter a laboratory ID to load the chart.</p>
              ) : chartQ.isLoading ? (
                <p className="text-xs text-neutral-500">Loading chart…</p>
              ) : chartQ.isError ? (
                <p className="text-xs text-red-600">{(chartQ.error as Error).message}</p>
              ) : (
                <CalibrationPlotlyChart chartJson={chartQ.data as Record<string, unknown>} />
              )}
            </div>
          </>
        ) : null}
      </div>
    </Card>
  );
}
