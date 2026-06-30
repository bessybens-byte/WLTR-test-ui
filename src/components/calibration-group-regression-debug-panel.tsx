"use client";

import { JsonPrettyView } from "@/components/json-pretty-view";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import {
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
import { hasComputedRegressionOutputs } from "@/lib/regression-wire";
import type { MeResponse } from "@/lib/types/wltr";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

function cellStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

export function CalibrationGroupRegressionDebugPanel({
  groupId,
  me,
  selectedRegressionType,
  selectedWeightingMode,
}: {
  readonly groupId: string;
  readonly me: MeResponse | null | undefined;
  readonly selectedRegressionType?: unknown;
  readonly selectedWeightingMode?: unknown;
}) {
  const labInJwt = me?.laboratoryId;
  const [laboratoryIdOverride, setLaboratoryIdOverride] = useState("");
  const [selectedAnalyteId, setSelectedAnalyteId] = useState("");
  const [userPickedVariantKey, setUserPickedVariantKey] = useState<string | null>(null);
  const needPlatformLab = !labInJwt;

  const effectiveLaboratoryId = labInJwt || laboratoryIdOverride.trim() || undefined;
  const scopeParams = useMemo(
    () => (effectiveLaboratoryId ? { laboratoryId: effectiveLaboratoryId } : undefined),
    [effectiveLaboratoryId],
  );

  const groupSelectedModel = hasGroupSelectedModel({
    regressionType: selectedRegressionType ?? null,
    weightingMode: selectedWeightingMode ?? null,
  });

  const listParams = useMemo(
    () => buildCurveQueryParams(scopeParams, { groupSelectedModel, activeVariant: null }),
    [scopeParams, groupSelectedModel],
  );

  const analyteListQ = useQuery({
    queryKey: ["calibration-group-regression-inputs", groupId, effectiveLaboratoryId ?? "", "__list", listParams.regressionType ?? "", listParams.weightingMode ?? ""],
    queryFn: () => getCalibrationGroupRegressionInputs(groupId, listParams),
    enabled: !!groupId && (!needPlatformLab || !!laboratoryIdOverride.trim()),
  });

  const reportCardQ = useQuery({
    queryKey: ["calibration-group-report-card", groupId, effectiveLaboratoryId ?? ""],
    queryFn: () => getCalibrationGroupReportCard(groupId, scopeParams),
    enabled: !!groupId && (!needPlatformLab || !!laboratoryIdOverride.trim()),
    retry: false,
  });

  const hasComputedOutputs = useMemo(() => {
    const rows = Array.isArray(analyteListQ.data) ? analyteListQ.data : [];
    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      if (typeof raw !== "object" || raw === null) continue;
      const points = Array.isArray((raw as Record<string, unknown>).points)
        ? ((raw as Record<string, unknown>).points as Record<string, unknown>[])
        : [];
      if (hasComputedRegressionOutputs(points)) return true;
    }
    return false;
  }, [analyteListQ.data]);

  const analyteChoices = useMemo(() => {
    const rows = Array.isArray(analyteListQ.data) ? analyteListQ.data : [];
    const out: { analyteId: string; label: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      if (typeof raw !== "object" || raw === null) continue;
      const r = raw as Record<string, unknown>;
      const aid = cellStr(r.analyteId);
      if (!aid) continue;
      const name = cellStr(r.analyteName) || "(unnamed analyte)";
      out.push({ analyteId: aid, label: `${name} · ${aid.slice(0, 8)}…` });
    }
    return out;
  }, [analyteListQ.data]);

  useEffect(() => setUserPickedVariantKey(null), [selectedAnalyteId]);

  const { variants: variantOptions, fromReportCard } = useMemo(
    () =>
      resolveVariantOptions(reportCardQ.data as Record<string, unknown> | undefined, selectedAnalyteId, {
        allowFallback: !groupSelectedModel || hasComputedOutputs,
      }),
    [reportCardQ.data, selectedAnalyteId, hasComputedOutputs, groupSelectedModel],
  );

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
    () => buildCurveQueryParams(scopeParams, { groupSelectedModel, activeVariant }),
    [scopeParams, groupSelectedModel, activeVariant],
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

  const canLoad =
    !!groupId &&
    !!selectedAnalyteId &&
    (!needPlatformLab || !!laboratoryIdOverride.trim());

  const debugQ = useQuery({
    queryKey: [
      "calibration-group-regression-debug",
      groupId,
      selectedAnalyteId,
      effectiveLaboratoryId ?? "",
      curveParams.regressionType ?? "",
      curveParams.weightingMode ?? "",
    ],
    queryFn: () => getCalibrationGroupRegressionDebug(groupId, selectedAnalyteId, curveParams),
    enabled: canLoad,
  });

  return (
    <Card className="overflow-hidden p-0 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04]">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-neutral-50 to-white px-5 py-4 dark:border-neutral-800 dark:from-neutral-900/70 dark:to-neutral-950">
        <div className="flex gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-100 via-amber-50 to-orange-50 text-[11px] font-bold tracking-tight text-amber-950 shadow-sm dark:border-amber-800/70 dark:from-amber-950 dark:via-orange-950/70 dark:to-neutral-950 dark:text-amber-100 dark:shadow-none"
            aria-hidden
          >
            QA
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Regression debug
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              Full weighted-regression intermediates after compute{" "}
              <code className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-neutral-800">
                perm.groups.approve
              </code>
              . Use the variant filter to compare any computed model — expect{" "}
              <span className="font-medium text-neutral-800 dark:text-neutral-200">404</span> before compute.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {needPlatformLab ? (
          <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-700 dark:bg-neutral-900/30">
            <Label htmlFor="rdLab">Laboratory ID</Label>
            <p className="mb-2 text-[11px] text-neutral-500 dark:text-neutral-400">Required for platform operators.</p>
            <Input
              id="rdLab"
              value={laboratoryIdOverride}
              onChange={(e) => setLaboratoryIdOverride(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="font-mono text-xs"
            />
          </div>
        ) : (
          <div className="rounded-lg bg-neutral-100/70 px-3 py-2 text-[11px] text-neutral-600 dark:bg-neutral-900/60 dark:text-neutral-400">
            Laboratory scope comes from your access token — no laboratory query parameter is sent.
          </div>
        )}

        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[14rem] flex-1">
            <Label htmlFor="rdAnalyte">Analyte</Label>
            <Select
              id="rdAnalyte"
              className="mt-1"
              value={selectedAnalyteId}
              disabled={analyteListQ.isLoading || analyteChoices.length === 0}
              onChange={(e) => setSelectedAnalyteId(e.target.value)}
            >
              <option value="">
                {analyteListQ.isLoading ? "Loading…" : analyteChoices.length ? "Select analyte…" : "No analytes"}
              </option>
              {analyteChoices.map((c) => (
                <option key={c.analyteId} value={c.analyteId}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          {variantOptions.length > 0 && selectedAnalyteId ? (
            <div className="min-w-[14rem] flex-1">
              <Label htmlFor="rdVariant">Model variant</Label>
              <Select
                id="rdVariant"
                className="mt-1"
                value={effectiveVariantKey}
                disabled={!selectedAnalyteId}
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
          ) : !hasComputedOutputs && selectedAnalyteId ? (
            <p className="pb-1 text-xs text-neutral-500">Run compute to list variants.</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={!groupId || inputsQ.isFetching}
              onClick={() => void inputsQ.refetch()}
            >
              Refresh list
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!canLoad || debugQ.isFetching}
              onClick={() => void debugQ.refetch()}
            >
              {debugQ.isFetching ? "Loading…" : "Reload snapshot"}
            </Button>
          </div>
        </div>

        {debugQ.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {(debugQ.error as Error).message}
          </div>
        ) : null}

        {debugQ.isLoading && canLoad ? (
          <div className="text-sm text-neutral-500">Loading regression snapshot…</div>
        ) : null}

        {debugQ.isSuccess && debugQ.data ? (
          <JsonPrettyView
            value={debugQ.data}
            title="Regression snapshot"
            subtitle={
              <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                Analyte <span className="text-neutral-700 dark:text-neutral-300">{selectedAnalyteId}</span>
                {activeVariant ? (
                  <>
                    {" "}
                    ·{" "}
                    <span className="text-neutral-700 dark:text-neutral-300">
                      {modelVariantLabel(activeVariant.regressionType, activeVariant.weightingMode)}
                    </span>
                  </>
                ) : null}
              </span>
            }
          />
        ) : null}
      </div>
    </Card>
  );
}
