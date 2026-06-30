"use client";

import { Badge, Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import {
  excludeCalibrationPoint,
  getCalibrationGroupRegressionInputs,
  getCalibrationGroupReportCard,
  reinstateCalibrationPoint,
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
import {
  exclusionReasonLabel,
  hasComputedRegressionOutputs,
  regressionPointAmountRatio,
  regressionPointPredictedResponse,
  regressionPointResponseRatio,
} from "@/lib/regression-wire";
import type { MeResponse } from "@/lib/types/wltr";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function cellStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function formatNum(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return cellStr(v) || "—";
}

function exclusionKeyFromRow(p: Record<string, unknown>, analyteId: string): string | null {
  const runId = cellStr(p.sourceRunId);
  if (!analyteId || !runId) return null;
  return `${analyteId}:${runId}`;
}

type ParsedRegressionTable = Readonly<{
  key: string;
  analyteId: string;
  analyteName: string;
  points: readonly Record<string, unknown>[];
}>;

function parseRegressionTables(data: unknown): ParsedRegressionTable[] {
  if (!Array.isArray(data)) return [];
  const out: ParsedRegressionTable[] = [];
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

function RegressionPointsTable({
  groupId,
  canManagePoints,
  analyteId,
  analyteName,
  points,
}: {
  readonly groupId: string;
  readonly canManagePoints: boolean;
  readonly analyteId: string;
  readonly analyteName: string;
  readonly points: readonly Record<string, unknown>[];
}) {
  const qc = useQueryClient();
  const [excludeFor, setExcludeFor] = useState<string | null>(null);
  const [reason, setReason] = useState<string>("ManualExclude");
  const [note, setNote] = useState("");

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["calibration-group-regression-inputs", groupId] });
    await qc.invalidateQueries({ queryKey: ["calibration-group-readiness"] });
    await qc.invalidateQueries({ queryKey: ["calibration-group-chart", groupId] });
    await qc.invalidateQueries({ queryKey: ["calibration-group-regression-debug", groupId] });
  };

  const excludeMut = useMutation({
    mutationFn: (args: { analyteId: string; calRunId: string; reason: string; note: string }) =>
      excludeCalibrationPoint(groupId, args),
    onSuccess: async () => {
      setExcludeFor(null);
      setNote("");
      await invalidate();
    },
  });

  const includeMut = useMutation({
    mutationFn: (args: { analyteId: string; calRunId: string }) =>
      reinstateCalibrationPoint(groupId, args.analyteId, args.calRunId),
    onSuccess: invalidate,
  });

  const anyExcludablePoint = useMemo(
    () => points.some((p) => Boolean(exclusionKeyFromRow(p, analyteId))),
    [points, analyteId],
  );

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
      <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium dark:border-neutral-800 dark:bg-neutral-900/50">
        <span>{analyteName}</span>
        {analyteId ? <span className="ml-2 font-mono text-[10px] text-neutral-500">{analyteId}</span> : null}
        <span className="ml-2 text-neutral-500">({points.length} point{points.length === 1 ? "" : "s"})</span>
      </div>
      {canManagePoints && !anyExcludablePoint ? (
        <p className="border-b border-neutral-200 px-3 py-2 text-[11px] text-amber-800 dark:border-neutral-800 dark:text-amber-200">
          Each row needs <code className="rounded bg-amber-100 px-1 dark:bg-amber-950">sourceRunId</code> and a
          canonical analyte id to exclude or re-include via{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-950">POST …/point-exclusions</code>.
        </p>
      ) : null}
      {excludeFor ? (
        <div className="space-y-3 border-b border-neutral-200 bg-neutral-50/80 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-900/30">
          <div className="text-xs font-medium">Exclude measurement {excludeFor.replace(":", " @ run ")}</div>
          <div>
            <Label htmlFor={`excl-reason-${excludeFor}`}>Reason</Label>
            <Select
              id={`excl-reason-${excludeFor}`}
              className="mt-1"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="ManualExclude">Manual exclude</option>
              <option value="PctDiffOutOfRange">% diff out of range</option>
            </Select>
          </div>
          <div>
            <Label htmlFor={`excl-note-${excludeFor}`}>Note (required)</Label>
            <Textarea
              id={`excl-note-${excludeFor}`}
              className="mt-1 min-h-[72px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Analyst justification for audit…"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={!note.trim() || excludeMut.isPending}
              onClick={() => {
                const [exAnalyteId, calRunId] = excludeFor.split(":");
                if (!exAnalyteId || !calRunId) return;
                void excludeMut.mutateAsync({
                  analyteId: exAnalyteId,
                  calRunId,
                  reason,
                  note: note.trim(),
                });
              }}
            >
              Confirm exclude
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={excludeMut.isPending}
              onClick={() => {
                setExcludeFor(null);
                setNote("");
              }}
            >
              Cancel
            </Button>
            {excludeMut.isError ? (
              <span className="text-xs text-red-600">{(excludeMut.error as Error).message}</span>
            ) : null}
          </div>
        </div>
      ) : null}
      {points.length === 0 ? (
        <p className="p-3 text-xs text-neutral-500">No points for this analyte.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[11px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                {canManagePoints ? (
                  <th className="whitespace-nowrap px-2 py-2 font-medium">Actions</th>
                ) : null}
                <th className="whitespace-nowrap px-2 py-2 font-medium">Level</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">True conc</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">Amount ratio (X)</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">Std response</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">IS response</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">Response ratio (Y)</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">1/X</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">1/X²</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">Weight</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">ŷ pred</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">Residual</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">% diff</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">RF</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">Calc conc</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">In</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">Exclusion</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">Run</th>
                <th className="min-w-[6rem] px-2 py-2 font-medium">Run name</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">Manual</th>
                <th className="min-w-[8rem] px-2 py-2 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p, pi) => {
                const exLabel = exclusionReasonLabel(p.exclusionReason);
                const runId = cellStr(p.sourceRunId);
                const runName = cellStr(p.sourceRunName);
                const levelName = cellStr(p.levelName);
                const included = Boolean(p.isIncluded);
                const exclusionKey = exclusionKeyFromRow(p, analyteId);
                const busy = excludeMut.isPending || includeMut.isPending;
                return (
                  <tr
                    key={`${analyteId}-${pi}-${runId}-${String(pi)}`}
                    className="border-b border-neutral-100 dark:border-neutral-900"
                  >
                    {canManagePoints ? (
                      <td className="whitespace-nowrap px-2 py-1.5 align-top">
                        {exclusionKey ? (
                          <div className="flex flex-col gap-1">
                            {included ? (
                              excludeFor === exclusionKey ? (
                                <span className="text-[10px] text-neutral-500">Pending…</span>
                              ) : (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="!px-2 !py-1 !text-[10px]"
                                  disabled={busy || Boolean(excludeFor && excludeFor !== exclusionKey)}
                                  onClick={() => {
                                    setExcludeFor(exclusionKey);
                                    setReason("ManualExclude");
                                    setNote("");
                                  }}
                                >
                                  Exclude
                                </Button>
                              )
                            ) : (
                              <Button
                                type="button"
                                variant="secondary"
                                className="!px-2 !py-1 !text-[10px]"
                                disabled={busy}
                                onClick={() => {
                                  const [exAnalyteId, calRunId] = exclusionKey.split(":");
                                  if (!exAnalyteId || !calRunId) return;
                                  void includeMut.mutateAsync({ analyteId: exAnalyteId, calRunId });
                                }}
                              >
                                Re-include
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                    ) : null}
                    <td className="max-w-[8rem] truncate px-2 py-1.5 text-[10px]" title={levelName || undefined}>
                      {levelName || "—"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono">{formatNum(p.trueConcentration)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono">{formatNum(regressionPointAmountRatio(p))}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono">{formatNum(p.standardResponse)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono">{formatNum(p.isResponse)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono">{formatNum(regressionPointResponseRatio(p))}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono">{formatNum(p.inverseAmountRatio)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono">{formatNum(p.inverseAmountRatioSquared)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono">{formatNum(p.weight)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono">{formatNum(regressionPointPredictedResponse(p))}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono">{formatNum(p.residual)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono">{formatNum(p.percentDiff)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono">{formatNum(p.responseFactor)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono">{formatNum(p.calcConcentration)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5">
                      {included ? <Badge tone="ok">Yes</Badge> : <Badge tone="neutral">No</Badge>}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono text-[10px]">{exLabel}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono text-[10px]">
                      {runId ? (
                        <Link className="text-blue-600 underline dark:text-blue-400" href={`/runs/${runId}`}>
                          {runId.slice(0, 8)}…
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="max-w-[10rem] truncate px-2 py-1.5 text-[10px]" title={runName || undefined}>
                      {runName || "—"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5">{p.isManualIntegration ? "Yes" : "—"}</td>
                    <td className="px-2 py-1.5 text-neutral-600 dark:text-neutral-400">
                      {cellStr(p.validationMessage) || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {includeMut.isError ? (
            <div className="border-t border-neutral-100 px-2 py-2 text-xs text-red-600 dark:border-neutral-900">
              {(includeMut.error as Error).message}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function CalibrationGroupRegressionInputsPanel({
  groupId,
  me,
  canManagePoints = false,
  selectedRegressionType,
  selectedWeightingMode,
}: {
  readonly groupId: string;
  readonly me: MeResponse | null | undefined;
  readonly canManagePoints?: boolean;
  readonly selectedRegressionType?: unknown;
  readonly selectedWeightingMode?: unknown;
}) {
  const labInJwt = me?.laboratoryId;
  const [laboratoryIdOverride, setLaboratoryIdOverride] = useState("");
  /** `null` = follow first analyte in the latest payload; otherwise user-picked `key`. */
  const [userPickedKey, setUserPickedKey] = useState<string | null>(null);
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
    enabled: Boolean(groupId && effectiveLaboratoryId),
  });

  const analyteRows = useMemo(() => parseRegressionTables(analyteListQ.data), [analyteListQ.data]);

  const hasComputedOutputs = useMemo(
    () => analyteRows.some((row) => hasComputedRegressionOutputs(row.points)),
    [analyteRows],
  );

  useEffect(() => {
    setUserPickedKey(null);
    setUserPickedVariantKey(null);
  }, [groupId]);

  const effectiveKey = useMemo(() => {
    if (!analyteRows.length) return "";
    if (userPickedKey && analyteRows.some((t) => t.key === userPickedKey)) return userPickedKey;
    return analyteRows[0].key;
  }, [analyteRows, userPickedKey]);

  const selectedAnalyte = analyteRows.find((t) => t.key === effectiveKey) ?? null;

  useEffect(() => setUserPickedVariantKey(null), [selectedAnalyte?.analyteId]);

  const reportCardQ = useQuery({
    queryKey: ["calibration-group-report-card", groupId, effectiveLaboratoryId ?? ""],
    queryFn: () => getCalibrationGroupReportCard(groupId, scopeParams),
    enabled: Boolean(groupId && effectiveLaboratoryId),
    retry: false,
  });

  const { variants: variantOptions, fromReportCard } = useMemo(
    () =>
      resolveVariantOptions(reportCardQ.data as Record<string, unknown> | undefined, selectedAnalyte?.analyteId ?? "", {
        allowFallback: !groupSelectedModel || analyteRows.length > 0,
      }),
    [reportCardQ.data, selectedAnalyte?.analyteId, analyteRows.length, groupSelectedModel],
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

  const q = useQuery({
    queryKey: [
      "calibration-group-regression-inputs",
      groupId,
      effectiveLaboratoryId ?? "",
      curveParams.regressionType ?? "",
      curveParams.weightingMode ?? "",
    ],
    queryFn: () => getCalibrationGroupRegressionInputs(groupId, curveParams),
    enabled: Boolean(groupId && effectiveLaboratoryId),
  });

  const tableRows = useMemo(() => parseRegressionTables(q.data), [q.data]);
  const selected = tableRows.find((t) => t.key === effectiveKey) ?? selectedAnalyte;

  return (
    <Card>
      <div className="text-sm font-medium">Regression input tables</div>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
        Per-analyte <strong>X</strong> (true concentration from calibration level), <strong>Y</strong> (response ratio
        when available), and <strong>weight</strong> from the group&apos;s weighting rules. After{" "}
        <code className="rounded bg-neutral-100 px-1 text-[10px] dark:bg-neutral-800">POST …/compute</code>, persisted{" "}
        <strong>ŷ</strong>, residual, and %diff appear when returned by the API. Manual exclude/re-include keys on{" "}
        <code className="rounded bg-neutral-100 px-1 text-[10px] dark:bg-neutral-800">analyteId</code> +{" "}
        <code className="rounded bg-neutral-100 px-1 text-[10px] dark:bg-neutral-800">sourceRunId</code> via{" "}
        <code className="rounded bg-neutral-100 px-1 text-[10px] dark:bg-neutral-800">point-exclusions</code> — requires{" "}
        <code className="rounded bg-neutral-100 px-1 text-[10px] dark:bg-neutral-800">perm.runs.upload</code> and a Draft
        or Computed group. Recomputing clears prior manual include/exclude until set again after compute.
      </p>
      {needPlatformLab ? (
        <div className="mt-4">
          <Label htmlFor="regressionInputsLab">Laboratory ID (required for platform users)</Label>
          <Input
            id="regressionInputsLab"
            value={laboratoryIdOverride}
            onChange={(e) => setLaboratoryIdOverride(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="mt-1 font-mono text-xs"
          />
        </div>
      ) : (
        <p className="mt-4 text-xs text-neutral-600 dark:text-neutral-400">
          Scoped to your laboratory from the access token.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-4">
        {analyteRows.length > 0 ? (
          <div className="min-w-[14rem] flex-1">
            <Label htmlFor="regressionAnalyte">Analyte</Label>
            <Select
              id="regressionAnalyte"
              className="mt-1"
              value={effectiveKey}
              disabled={analyteListQ.isLoading}
              onChange={(e) => setUserPickedKey(e.target.value)}
            >
              {analyteRows.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.analyteName}
                  {t.analyteId ? ` · ${t.analyteId.slice(0, 8)}…` : ""} ({t.points.length} pt{t.points.length === 1 ? "" : "s"})
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        {variantOptions.length > 0 && selectedAnalyte?.analyteId ? (
          <div className="min-w-[14rem] flex-1">
            <Label htmlFor="regressionInputsVariant">Model variant</Label>
            <Select
              id="regressionInputsVariant"
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
                Report card unavailable — showing all standard regression and weighting combinations.
              </p>
            ) : null}
          </div>
        ) : !hasComputedOutputs && selectedAnalyte?.analyteId ? (
          <p className="pb-1 text-xs text-neutral-500">Run compute to compare regression variants.</p>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          disabled={!groupId || !effectiveLaboratoryId || q.isFetching}
          onClick={() => void q.refetch()}
        >
          Refresh
        </Button>
      </div>

      {activeVariant ? (
        <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
          Showing inputs for{" "}
          <strong>{modelVariantLabel(activeVariant.regressionType, activeVariant.weightingMode)}</strong>.
        </p>
      ) : groupSelectedModel ? (
        <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
          Showing inputs for the group-selected model (
          {modelVariantLabel(selectedRegressionType!, selectedWeightingMode!)}).
        </p>
      ) : null}

      <div className="mt-4 space-y-4">
        {analyteListQ.isLoading || q.isLoading ? <div className="text-sm text-neutral-500">Loading…</div> : null}
        {q.isError ? (
          <div className="text-sm text-red-600">{(q.error as Error).message}</div>
        ) : null}
        {q.isSuccess && tableRows.length === 0 && analyteRows.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No tables returned — the group may have no linked CAL runs with resolved analyte measurements yet.
          </p>
        ) : null}
        {q.isSuccess && selected ? (
          <RegressionPointsTable
            groupId={groupId}
            canManagePoints={canManagePoints}
            analyteId={selected.analyteId}
            analyteName={selected.analyteName}
            points={selected.points}
          />
        ) : null}
      </div>
    </Card>
  );
}
