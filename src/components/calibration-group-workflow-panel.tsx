"use client";

import { Badge, Button, Card, Label, Textarea } from "@/components/ui";
import {
  approveCalibrationGroup,
  getCalibrationGroupReportCard,
  rejectCalibrationGroup,
  selectCalibrationGroupModel,
} from "@/lib/api/wltr-api";
import { suggestedModelFromReportCard } from "@/lib/calibration-variant-utils";
import {
  modelVariantLabel,
  normalizeRegressionType,
  normalizeWeightingMode,
  variantKey,
} from "@/lib/regression-wire";
import {
  CalibrationGroupStatus,
  GROUP_STATUS_LABEL,
  hasPermission,
  PERMS,
  type MeResponse,
} from "@/lib/types/wltr";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

function cell(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  return "—";
}

function calStatusTone(v: unknown): "ok" | "bad" | "neutral" {
  if (v === "Pass" || v === 1) return "ok";
  if (v === "Fail" || v === 0) return "bad";
  return "neutral";
}

function modelLabel(regressionType: unknown, weightingMode: unknown): string {
  return modelVariantLabel(regressionType, weightingMode);
}


export function CalibrationGroupWorkflowPanel({
  groupId,
  groupStatus,
  computationStale,
  me,
}: {
  readonly groupId: string;
  readonly groupStatus: number;
  readonly computationStale?: boolean;
  readonly me: MeResponse | null | undefined;
}) {
  const qc = useQueryClient();
  const canApprove = hasPermission(me, PERMS.groupsApprove);
  const canSelectModel = canApprove;
  const isComputed = groupStatus === CalibrationGroupStatus.Computed;
  const isTerminal =
    groupStatus === CalibrationGroupStatus.Approved || groupStatus === CalibrationGroupStatus.Rejected;

  const reportCardParams = me?.laboratoryId ? { laboratoryId: me.laboratoryId } : undefined;
  const reportCard = useQuery({
    queryKey: ["calibration-group-report-card", groupId, me?.laboratoryId ?? ""],
    queryFn: () => getCalibrationGroupReportCard(groupId, reportCardParams),
    enabled: isComputed || isTerminal,
    retry: false,
    select: (raw: unknown): Record<string, unknown> => {
      if (raw && typeof raw === "object") return raw as Record<string, unknown>;
      return {};
    },
  });

  const sessionKey = `wltr:sel:${groupId}`;

  function loadSelections(): Map<string, string> {
    try {
      const raw = sessionStorage.getItem(sessionKey);
      if (raw) return new Map(JSON.parse(raw) as [string, string][]);
    } catch {
      // ignore parse errors
    }
    return new Map();
  }

  function saveSelections(map: Map<string, string>) {
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify([...map]));
    } catch {
      // ignore quota errors
    }
  }

  /** Per-analyte selection state: analyteId → variantKey ("rt:wm"). Persisted in sessionStorage. */
  const [selectedByAnalyte, setSelectedByAnalyte] = useState<Map<string, string>>(loadSelections);

  // Clear stale selections whenever the group is recomputed or reverts below Computed.
  // Without this, old "✓ Selected" indicators would persist after a reject+recompute cycle.
  useEffect(() => {
    if (stale || groupStatus < CalibrationGroupStatus.Computed) {
      try {
        sessionStorage.removeItem(sessionKey);
      } catch {
        // ignore
      }
      setSelectedByAnalyte(new Map());
    }
  }, [stale, groupStatus, sessionKey]);

  const selectModel = useMutation({
    mutationFn: async (args: { regressionType: string; weightingMode: string; analyteIds: string[] }) => {
      await Promise.all(
        args.analyteIds.map((analyteId) =>
          selectCalibrationGroupModel(groupId, analyteId, {
            regressionType: args.regressionType,
            weightingMode: args.weightingMode,
          }),
        ),
      );
    },
    onSuccess: async (_, args) => {
      const key = variantKey(args.regressionType, args.weightingMode);
      setSelectedByAnalyte((prev) => {
        const next = new Map(prev);
        args.analyteIds.forEach((id) => next.set(id, key));
        saveSelections(next);
        return next;
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["calibration-groups", groupId] }),
        qc.invalidateQueries({ queryKey: ["calibration-group-report-card", groupId] }),
        qc.invalidateQueries({ queryKey: ["calibration-group-summary-report", groupId] }),
      ]);
    },
  });

  const selectOneAnalyte = useCallback(
    (analyteId: string, regressionType: string, weightingMode: string) =>
      selectModel.mutate({ regressionType, weightingMode, analyteIds: [analyteId] }),
    [selectModel],
  );

  const [qaComment, setQaComment] = useState("");

  const approve = useMutation({
    mutationFn: () => approveCalibrationGroup(groupId, qaComment.trim() ? { comment: qaComment.trim() } : undefined),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["calibration-groups", groupId] });
    },
  });

  const reject = useMutation({
    mutationFn: () => rejectCalibrationGroup(groupId, qaComment.trim() ? { comment: qaComment.trim() } : undefined),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["calibration-groups", groupId] });
    },
  });

  const card = reportCard.data;
  const stale = Boolean(computationStale ?? card?.isComputationStale);
  const suggested = suggestedModelFromReportCard(card);
  const variants = Array.isArray(card?.variants) ? (card.variants as Record<string, unknown>[]) : [];

  const allReportCardAnalyteIds = useMemo(
    () =>
      variants
        .flatMap((v) =>
          Array.isArray((v as Record<string, unknown>).analytes)
            ? ((v as Record<string, unknown>).analytes as Record<string, unknown>[])
            : [],
        )
        .map((a) => (typeof a.analyteId === "string" ? a.analyteId : ""))
        .filter(Boolean)
        .filter((id, i, arr) => arr.indexOf(id) === i),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [card],
  );

  const allAnalytesSelected =
    allReportCardAnalyteIds.length > 0 && allReportCardAnalyteIds.every((id) => selectedByAnalyte.has(id));

  const workflowSteps = useMemo(
    () => [
      { n: 1, label: "Compute regression", done: groupStatus >= CalibrationGroupStatus.Computed },
      {
        n: 2,
        label: "Choose model per analyte",
        done: allAnalytesSelected || groupStatus === CalibrationGroupStatus.Approved,
      },
      { n: 3, label: "QA review & approval", done: groupStatus === CalibrationGroupStatus.Approved },
    ],
    [groupStatus, allAnalytesSelected],
  );

  if (groupStatus === CalibrationGroupStatus.Draft) {
    return (
      <Card>
        <div className="text-sm font-medium">Calibration workflow</div>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          After the group passes readiness checks, run regression to compare model variants and submit for QA approval.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Calibration workflow</div>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
              Compare regression variants on the report card, select a model for each analyte, then QA approves or
              rejects the group.
            </p>
          </div>
          <Badge
            tone={
              groupStatus === CalibrationGroupStatus.Approved
                ? "ok"
                : groupStatus === CalibrationGroupStatus.Rejected
                  ? "bad"
                  : "neutral"
            }
          >
            {GROUP_STATUS_LABEL[groupStatus] ?? "Unknown"}
          </Badge>
        </div>

        <ol className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-4">
          {workflowSteps.map((s) => (
            <li
              key={s.n}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs ${
                s.done
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <span className="font-semibold">Step {s.n}.</span> {s.label}
            </li>
          ))}
        </ol>

        {stale ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Results are stale — exclusions or point changes were made since the last compute. Re-run regression before
            selecting a model or approving.
          </p>
        ) : null}

        <p className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">
          Use the report card below to select a model variant per analyte. Use <strong>Select for all analytes</strong>{" "}
          on a variant row to apply it in bulk, or hit <strong>Select</strong> on individual analyte rows for
          fine-grained control.
        </p>

        {suggested ? (
          <div className="mt-2 flex items-center justify-between gap-4 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900/50">
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              <span className="font-medium text-neutral-800 dark:text-neutral-200">Suggested variant</span>{" "}
              (highest pass-count):{" "}
              <strong>{modelLabel(suggested.regressionType, suggested.weightingMode)}</strong>
              {typeof suggested.reportCardScore === "number" ? (
                <span className="ml-1 text-neutral-500">— {suggested.reportCardScore} passes</span>
              ) : null}
            </p>
            {canSelectModel && !isTerminal && !stale ? (
              <Button
                type="button"
                variant="secondary"
                className="shrink-0 py-1 text-xs"
                disabled={selectModel.isPending || allReportCardAnalyteIds.length === 0}
                onClick={() =>
                  selectModel.mutate({
                    regressionType: suggested.regressionType,
                    weightingMode: suggested.weightingMode,
                    analyteIds: allReportCardAnalyteIds,
                  })
                }
              >
                Apply to all analytes
              </Button>
            ) : null}
          </div>
        ) : null}
      </Card>

      {(isComputed || isTerminal) && (
        <Card>
          <div className="text-sm font-medium">Report card — model comparison</div>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            All supported regression and weighting combinations computed in one pass, ranked by pass-count per analyte.
          </p>

          {reportCard.isLoading ? <div className="mt-3 text-sm text-neutral-500">Loading report card…</div> : null}
          {reportCard.isError ? (
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
              Report card endpoint is not available on this API yet — use the <strong>Model variant</strong> filter on
              Regression results and Regression debug to compare curves.
            </p>
          ) : null}

          {variants.length ? (
            <div className="mt-4 space-y-4">
              {variants.map((v, vi) => {
                const rt = v.regressionType;
                const wm = v.weightingMode;
                const analyteRows = Array.isArray(v.analytes) ? (v.analytes as Record<string, unknown>[]) : [];
                return (
                  <div
                    key={`${String(rt)}-${String(wm)}-${vi}`}
                    className={`rounded-lg border dark:border-neutral-800 ${
                      v.isSuggestedModel ? "border-blue-300 dark:border-blue-800" : "border-neutral-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900/50">
                      <div className="text-sm font-medium">
                        {modelLabel(rt, wm)}
                        {v.isSuggestedModel ? (
                          <Badge tone="ok" className="ml-2">
                            Suggested
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                        <span>
                          Score: <span className="font-mono">{cell(v.reportCardScore)}</span>
                        </span>
                        <span>
                          Analytes: <span className="font-mono">{cell(v.totalAnalytes ?? analyteRows.length)}</span>
                        </span>
                        {canSelectModel && !isTerminal && !stale ? (
                          <Button
                            type="button"
                            variant="secondary"
                            className="py-1 text-xs"
                            disabled={
                              selectModel.isPending ||
                              !normalizeRegressionType(rt) ||
                              !normalizeWeightingMode(wm) ||
                              analyteRows.length === 0
                            }
                            onClick={() => {
                              const regressionType = normalizeRegressionType(rt);
                              const weightingMode = normalizeWeightingMode(wm);
                              if (!regressionType || !weightingMode) return;
                              const analyteIds = analyteRows
                                .map((a) => (typeof a.analyteId === "string" ? a.analyteId : ""))
                                .filter(Boolean);
                              selectModel.mutate({ regressionType, weightingMode, analyteIds });
                            }}
                          >
                            Select for all analytes
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {analyteRows.length ? (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="border-b border-neutral-100 dark:border-neutral-900">
                              <th className="px-3 py-2 font-medium">Analyte</th>
                              <th className="px-3 py-2 font-medium">R²</th>
                              <th className="px-3 py-2 font-medium">Cal</th>
                              <th className="px-3 py-2 font-medium">ICV</th>
                              <th className="px-3 py-2 font-medium">Missed pts</th>
                              {canSelectModel && !isTerminal && !stale ? (
                                <th className="px-3 py-2 font-medium">Model</th>
                              ) : null}
                            </tr>
                          </thead>
                          <tbody>
                            {analyteRows.map((a, ai) => {
                              const aId = typeof a.analyteId === "string" ? a.analyteId : "";
                              const thisKey = variantKey(rt, wm);
                              const isSelected = !!aId && selectedByAnalyte.get(aId) === thisKey;
                              const regressionType = normalizeRegressionType(rt);
                              const weightingMode = normalizeWeightingMode(wm);
                              return (
                                <tr
                                  key={`${cell(a.analyteId)}-${ai}`}
                                  className={`border-b border-neutral-50 last:border-b-0 dark:border-neutral-900 ${isSelected ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""}`}
                                >
                                  <td className="px-3 py-2">{cell(a.analyteName)}</td>
                                  <td className="px-3 py-2 font-mono">
                                    {typeof a.rSquared === "number" ? a.rSquared.toFixed(4) : "—"}
                                  </td>
                                  <td className="px-3 py-2">
                                    <Badge tone={calStatusTone(a.calStatus)}>
                                      {a.calStatus === 1 ? "Pass" : a.calStatus === 0 ? "Fail" : "—"}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2">
                                    {a.icvPassed === true ? "Pass" : a.icvPassed === false ? "Fail" : "—"}
                                  </td>
                                  <td className="px-3 py-2 font-mono">{cell(a.missedPointCount)}</td>
                                  {canSelectModel && !isTerminal && !stale ? (
                                    <td className="px-3 py-2">
                                      {isSelected ? (
                                        <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                          ✓ Selected
                                        </span>
                                      ) : (
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          className="!px-2 !py-0.5 !text-[10px]"
                                          disabled={
                                            selectModel.isPending || !aId || !regressionType || !weightingMode
                                          }
                                          onClick={() => {
                                            if (!aId || !regressionType || !weightingMode) return;
                                            selectOneAnalyte(aId, regressionType, weightingMode);
                                          }}
                                        >
                                          Select
                                        </Button>
                                      )}
                                    </td>
                                  ) : null}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="px-3 py-2 text-xs text-neutral-500">No analyte curves for this variant.</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : reportCard.isSuccess ? (
            <p className="mt-3 text-sm text-neutral-500">No analyte variants yet — run regression first.</p>
          ) : null}

          {selectModel.isError ? (
            <div className="mt-2 text-sm text-red-600">{(selectModel.error as Error).message}</div>
          ) : null}
        </Card>
      )}

      {canApprove && isComputed && !isTerminal ? (
        <Card>
          <div className="text-sm font-medium">QA decision</div>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            Approve locks the group for reporting. Reject is terminal. Optional comment is stored in the audit trail.
          </p>
          <div className="mt-3">
            <Label htmlFor="qa-comment">Comment (optional)</Label>
            <Textarea
              id="qa-comment"
              className="min-h-[72px] font-sans"
              value={qaComment}
              onChange={(e) => setQaComment(e.target.value)}
              placeholder="Review notes for the audit log…"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={approve.isPending || stale}
              onClick={() => approve.mutate()}
            >
              {approve.isPending ? "Approving…" : "Approve calibration"}
            </Button>
            <Button type="button" variant="danger" disabled={reject.isPending} onClick={() => reject.mutate()}>
              {reject.isPending ? "Rejecting…" : "Reject"}
            </Button>
          </div>
          {(approve.isError || reject.isError) && (
            <div className="mt-2 text-sm text-red-600">{((approve.error ?? reject.error) as Error).message}</div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
