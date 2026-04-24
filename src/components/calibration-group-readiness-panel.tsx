"use client";

import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { getCalibrationGroupReadiness } from "@/lib/api/wltr-api";
import type { MeResponse } from "@/lib/types/wltr";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

/** Matches `RunValidationIssueCode` in the API (for display). */
function cellStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

const ISSUE_CODE_NAMES: Record<number, string> = {
  0: "NonPositiveResponse",
  1: "MissingAnalyteMapping",
  2: "MissingInternalStandard",
  3: "MalformedConcentrationOrRatio",
  4: "NonPositiveInternalStandardResponse",
  5: "InsufficientCalibrationLevels",
  6: "CalibrationRunLevelUnresolved",
  7: "DuplicateCalibrationLevelInGroup",
  8: "CalibrationRunReferenceMissing",
  9: "InvalidCalibrationRunStatus",
  10: "InvalidResponseRatio",
};

function issueRowKey(raw: Record<string, unknown>, prefix: string, index: number): string {
  return [prefix, cellStr(raw.code), cellStr(raw.measurementId), cellStr(raw.calibrationRunId), String(index)].join(
    "|",
  );
}

function IssuesTable({
  title,
  items,
  tone,
}: {
  title: string;
  items: Record<string, unknown>[];
  tone: "err" | "warn";
}) {
  if (!items.length) return null;
  return (
    <div className="mt-4">
      <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{title}</div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
              <th className="py-2 pr-2">Code</th>
              <th className="py-2 pr-2">Severity</th>
              <th className="py-2 pr-2">Message</th>
              <th className="py-2 pr-2">Run</th>
              <th className="py-2 pr-2">Measurement</th>
            </tr>
          </thead>
          <tbody>
            {items.map((raw, i) => {
              const r = raw;
              const codeNum = typeof r.code === "number" ? r.code : Number(r.code);
              let codeLabel = "—";
              if (Number.isFinite(codeNum)) {
                const name = ISSUE_CODE_NAMES[codeNum as number];
                codeLabel = name ? `${codeNum} (${name})` : String(codeNum);
              } else if (r.code != null) {
                codeLabel = cellStr(r.code) || "—";
              }
              const isErr = Boolean(r.isError);
              return (
                <tr key={issueRowKey(r, tone, i)} className="border-b border-neutral-100 dark:border-neutral-900">
                  <td className="py-2 pr-2 font-mono">{codeLabel}</td>
                  <td className="py-2 pr-2">
                    {isErr ? (
                      <Badge tone={tone === "err" ? "bad" : "warn"}>Error</Badge>
                    ) : (
                      <span className="text-neutral-500">Warning</span>
                    )}
                  </td>
                  <td className="py-2 pr-2">{cellStr(r.message) || "—"}</td>
                  <td className="py-2 pr-2 font-mono text-[10px]">{r.calibrationRunId == null ? "—" : cellStr(r.calibrationRunId)}</td>
                  <td className="py-2 pr-2 font-mono text-[10px]">{r.measurementId == null ? "—" : cellStr(r.measurementId)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CalibrationGroupReadinessPanel({
  groupId,
  me,
}: {
  groupId: string;
  me: MeResponse | null | undefined;
}) {
  const labInJwt = me?.laboratoryId;
  const [laboratoryIdOverride, setLaboratoryIdOverride] = useState("");

  const effectiveLaboratoryId = labInJwt || laboratoryIdOverride.trim() || undefined;
  const queryParams = useMemo(
    () => (effectiveLaboratoryId ? { laboratoryId: effectiveLaboratoryId } : {}),
    [effectiveLaboratoryId],
  );

  const needPlatformLab = !labInJwt;

  const q = useQuery({
    queryKey: ["calibration-group-readiness", groupId, queryParams],
    queryFn: () => getCalibrationGroupReadiness(groupId, queryParams),
    enabled: !!groupId && (!!labInJwt || !!laboratoryIdOverride.trim()),
  });

  const blocking: Record<string, unknown>[] = Array.isArray(q.data?.blockingIssues)
    ? q.data.blockingIssues.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    : [];
  const warnings: Record<string, unknown>[] = Array.isArray(q.data?.warnings)
    ? q.data.warnings.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    : [];
  const isReady = Boolean(q.data?.isReady);
  const minPts = q.data?.minPointsRequired;
  const levelCount = q.data?.calibrationLevelCount;

  return (
    <Card>
      <div className="text-sm font-medium">Regression readiness</div>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
        Evaluates linked <strong>CAL</strong> runs only (not ICV). Blocking issues must be empty before a future compute
        step. Inverse weighting (1/x) positive-X rules apply at compute, not here.
      </p>

      <div className="mt-4 space-y-3">
        {needPlatformLab ? (
          <div>
            <Label htmlFor="readinessLab">Laboratory ID (required for platform users)</Label>
            <Input
              id="readinessLab"
              value={laboratoryIdOverride}
              onChange={(e) => setLaboratoryIdOverride(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="mt-1 font-mono text-xs"
            />
          </div>
        ) : (
          <p className="text-xs text-neutral-600 dark:text-neutral-400">Scoped to your laboratory from the access token.</p>
        )}
        <Button
          type="button"
          variant="secondary"
          disabled={!groupId || (needPlatformLab && !laboratoryIdOverride.trim()) || q.isFetching}
          onClick={() => void q.refetch()}
        >
          Refresh
        </Button>
      </div>

      <div className="mt-4">
        {q.isLoading ? <div className="text-sm">Loading…</div> : null}
        {q.isError ? <div className="text-sm text-red-600">{(q.error as Error).message}</div> : null}
        {q.isSuccess ? (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Ready for compute:</span>
              {isReady ? <Badge tone="ok">Yes</Badge> : <Badge tone="bad">No</Badge>}
            </div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400">
              CAL levels in group: <strong>{String(levelCount ?? "—")}</strong>
              {" · "}
              Minimum required: <strong>{String(minPts ?? "—")}</strong>
            </div>
            <IssuesTable title="Blocking issues" items={blocking} tone="err" />
            <IssuesTable title="Warnings" items={warnings} tone="warn" />
            {!blocking.length && !warnings.length ? (
              <div className="text-xs text-neutral-600 dark:text-neutral-400">No issues reported.</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
