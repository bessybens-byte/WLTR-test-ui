"use client";

import { Badge, Card } from "@/components/ui";
import {
  CalibrationGroupStatus,
  GROUP_STATUS_LABEL,
  hasPermission,
  PERMS,
  type MeResponse,
} from "@/lib/types/wltr";

export function CalibrationGroupWorkflowPanel({
  groupStatus,
  computationStale,
  me,
}: {
  readonly groupStatus: number;
  readonly computationStale?: boolean;
  readonly me: MeResponse | null | undefined;
}) {
  const canQaReview = hasPermission(me, PERMS.groupsApprove);
  const isComputed = groupStatus === CalibrationGroupStatus.Computed;
  const isTerminal =
    groupStatus === CalibrationGroupStatus.Approved || groupStatus === CalibrationGroupStatus.Rejected;

  const steps = [
    { n: 1, label: "Resolve readiness issues", done: isComputed || isTerminal },
    { n: 2, label: "Run regression (POST …/compute)", done: isComputed || isTerminal },
    { n: 3, label: "Review curves & regression debug", done: isComputed },
  ];

  if (groupStatus === CalibrationGroupStatus.Draft) {
    return (
      <Card>
        <div className="text-sm font-medium">Calibration workflow</div>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Clear blocking issues on the readiness panel, then run regression. Methodology is frozen from the method
          config snapshot at compute time.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Calibration workflow</div>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            After compute, use regression inputs, per-analyte charts, and regression debug (QA permission) to validate
            results. Approve/reject endpoints are not yet exposed in this API version — status may still show Approved
            when set by backend processes.
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
        {steps.map((s) => (
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

      {computationStale ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Results are stale — analyte exclusions or point include/exclude changed since the last compute. Re-run
          regression before relying on curve metrics.
        </p>
      ) : null}

      {canQaReview && isComputed ? (
        <p className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">
          QA reviewers: open <strong>Regression debug</strong> and <strong>Curve charts</strong> below for each analyte
          (`perm.groups.approve`).
        </p>
      ) : null}
    </Card>
  );
}
