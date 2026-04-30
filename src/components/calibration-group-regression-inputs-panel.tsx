"use client";

import { Badge, Button, Card, Label, Select, Textarea } from "@/components/ui";
import {
  excludeCalibrationPoint,
  getCalibrationGroupRegressionInputs,
  reinstateCalibrationPoint,
} from "@/lib/api/wltr-api";
import { EXCLUSION_REASON_LABEL, ExclusionReason } from "@/lib/types/wltr";
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

function pointIdFromRow(p: Record<string, unknown>): string {
  return (
    cellStr(p.calibrationPointId) ||
    cellStr(p.pointId) ||
    cellStr(p.id) // some API builds may expose the persisted `CalibrationPoint` id here
  );
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
  const [reason, setReason] = useState<number>(ExclusionReason.ManualExclude);
  const [note, setNote] = useState("");

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["calibration-group-regression-inputs", groupId] });
    await qc.invalidateQueries({ queryKey: ["calibration-group-readiness"] });
  };

  const excludeMut = useMutation({
    mutationFn: (args: { pointId: string; reason: number; note: string }) =>
      excludeCalibrationPoint(groupId, args.pointId, { reason: args.reason, note: args.note }),
    onSuccess: async () => {
      setExcludeFor(null);
      setNote("");
      await invalidate();
    },
  });

  const includeMut = useMutation({
    mutationFn: (pointId: string) => reinstateCalibrationPoint(groupId, pointId),
    onSuccess: invalidate,
  });

  const anyPersistedPoint = useMemo(
    () => points.some((p) => Boolean(pointIdFromRow(p))),
    [points],
  );

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
      <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium dark:border-neutral-800 dark:bg-neutral-900/50">
        <span>{analyteName}</span>
        {analyteId ? <span className="ml-2 font-mono text-[10px] text-neutral-500">{analyteId}</span> : null}
        <span className="ml-2 text-neutral-500">({points.length} point{points.length === 1 ? "" : "s"})</span>
      </div>
      {canManagePoints && !anyPersistedPoint ? (
        <p className="border-b border-neutral-200 px-3 py-2 text-[11px] text-amber-800 dark:border-neutral-800 dark:text-amber-200">
          API did not return a persisted point id (<code className="rounded bg-amber-100 px-1 dark:bg-amber-950">id</code>,
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-950">calibrationPointId</code>, or{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-950">pointId</code>) — exclude/re-include is available
          when the server exposes one of these on each row after compute.
        </p>
      ) : null}
      {excludeFor ? (
        <div className="space-y-3 border-b border-neutral-200 bg-neutral-50/80 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-900/30">
          <div className="text-xs font-medium">Exclude point {excludeFor.slice(0, 8)}…</div>
          <div>
            <Label htmlFor={`excl-reason-${excludeFor}`}>Reason</Label>
            <Select
              id={`excl-reason-${excludeFor}`}
              className="mt-1"
              value={String(reason)}
              onChange={(e) => setReason(Number(e.target.value))}
            >
              <option value={ExclusionReason.ManualExclude}>Manual exclude</option>
              <option value={ExclusionReason.PctDiffOutOfRange}>% diff out of range</option>
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
              onClick={() =>
                void excludeMut.mutateAsync({
                  pointId: excludeFor,
                  reason,
                  note: note.trim(),
                })
              }
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
                <th className="whitespace-nowrap px-2 py-2 font-medium">X</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">Y (ratio)</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">ŷ pred</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">Residual</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">% diff</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">Weight</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">In</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">Exclusion</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">Run</th>
                <th className="min-w-[6rem] px-2 py-2 font-medium">Run name</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">Level</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">Manual</th>
                <th className="min-w-[8rem] px-2 py-2 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p, pi) => {
                const ex = typeof p.exclusionReason === "number" ? p.exclusionReason : Number(p.exclusionReason);
                const exLabel = Number.isFinite(ex) ? EXCLUSION_REASON_LABEL[ex as number] ?? String(ex) : "—";
                const runId = cellStr(p.sourceRunId);
                const runName = cellStr(p.sourceRunName);
                const included = Boolean(p.isIncluded);
                const pid = pointIdFromRow(p);
                const busy = excludeMut.isPending || includeMut.isPending;
                return (
                  <tr
                    key={`${analyteId}-${pi}-${runId}-${String(pi)}`}
                    className="border-b border-neutral-100 dark:border-neutral-900"
                  >
                    {canManagePoints ? (
                      <td className="whitespace-nowrap px-2 py-1.5 align-top">
                        {pid ? (
                          <div className="flex flex-col gap-1">
                            {included ? (
                              excludeFor === pid ? (
                                <span className="text-[10px] text-neutral-500">Pending…</span>
                              ) : (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="!px-2 !py-1 !text-[10px]"
                                  disabled={busy || Boolean(excludeFor && excludeFor !== pid)}
                                  onClick={() => {
                                    setExcludeFor(pid);
                                    setReason(ExclusionReason.ManualExclude);
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
                                onClick={() => void includeMut.mutateAsync(pid)}
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
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono">{formatNum(p.x)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono">{formatNum(p.y)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono">{formatNum(p.predictedY)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono">{formatNum(p.residual)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono">{formatNum(p.percentDiff)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono">{formatNum(p.weight)}</td>
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
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono text-[10px]">
                      {p.calibrationLevelId == null ? "—" : cellStr(p.calibrationLevelId).slice(0, 8) + "…"}
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
  canManagePoints = false,
}: {
  readonly groupId: string;
  readonly canManagePoints?: boolean;
}) {
  /** `null` = follow first analyte in the latest payload; otherwise user-picked `key`. */
  const [userPickedKey, setUserPickedKey] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["calibration-group-regression-inputs", groupId],
    queryFn: () => getCalibrationGroupRegressionInputs(groupId),
    enabled: Boolean(groupId),
  });

  const tableRows = useMemo(() => parseRegressionTables(q.data), [q.data]);

  useEffect(() => {
    setUserPickedKey(null);
  }, [groupId]);

  const effectiveKey = useMemo(() => {
    if (!tableRows.length) return "";
    if (userPickedKey && tableRows.some((t) => t.key === userPickedKey)) return userPickedKey;
    return tableRows[0].key;
  }, [tableRows, userPickedKey]);

  const selected = tableRows.find((t) => t.key === effectiveKey) ?? null;

  return (
    <Card>
      <div className="text-sm font-medium">Regression input tables</div>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
        Per-analyte <strong>X</strong> (true concentration from calibration level), <strong>Y</strong> (response ratio
        when available), and <strong>weight</strong> from the group&apos;s weighting rules. After{" "}
        <code className="rounded bg-neutral-100 px-1 text-[10px] dark:bg-neutral-800">POST …/compute</code>, persisted{" "}
        <strong>ŷ</strong>, residual, and %diff appear when returned by the API. Manual exclude/re-include needs a row{" "}
        <code className="rounded bg-neutral-100 px-1 text-[10px] dark:bg-neutral-800">pointId</code> (or{" "}
        <code className="rounded bg-neutral-100 px-1 text-[10px] dark:bg-neutral-800">calibrationPointId</code>),
        typically after compute — requires{" "}
        <code className="rounded bg-neutral-100 px-1 text-[10px] dark:bg-neutral-800">perm.runs.upload</code> and a Draft
        or Computed group. Recomputing clears prior manual include/exclude until set again after compute.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        {tableRows.length > 0 ? (
          <div className="min-w-[14rem] flex-1">
            <Label htmlFor="regressionAnalyte">Analyte</Label>
            <Select
              id="regressionAnalyte"
              className="mt-1"
              value={effectiveKey}
              onChange={(e) => setUserPickedKey(e.target.value)}
            >
              {tableRows.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.analyteName}
                  {t.analyteId ? ` · ${t.analyteId.slice(0, 8)}…` : ""} ({t.points.length} pt{t.points.length === 1 ? "" : "s"})
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <Button type="button" variant="secondary" disabled={!groupId || q.isFetching} onClick={() => void q.refetch()}>
          Refresh
        </Button>
      </div>

      <div className="mt-4 space-y-4">
        {q.isLoading ? <div className="text-sm text-neutral-500">Loading…</div> : null}
        {q.isError ? (
          <div className="text-sm text-red-600">{(q.error as Error).message}</div>
        ) : null}
        {q.isSuccess && tableRows.length === 0 ? (
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
