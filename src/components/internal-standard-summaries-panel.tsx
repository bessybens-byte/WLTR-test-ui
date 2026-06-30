"use client";

import { Badge, Button, Card, Input, Label } from "@/components/ui";
import {
  downloadInternalStandardSummariesCsv,
  getCalibrationGroupInternalStandardSummaries,
  getRunInternalStandardSummaries,
} from "@/lib/api/wltr-api";
import type { MeResponse } from "@/lib/types/wltr";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

function num(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "—";
  return String(v);
}

export function InternalStandardSummariesPanel({
  variant,
  resourceId,
  me,
}: {
  variant: "run" | "calibrationGroup";
  resourceId: string;
  me: MeResponse | null | undefined;
}) {
  const labInJwt = me?.laboratoryId;
  const [laboratoryIdOverride, setLaboratoryIdOverride] = useState("");
  const [methodConfigId, setMethodConfigId] = useState("");

  const effectiveLaboratoryId = labInJwt || laboratoryIdOverride.trim() || undefined;
  const effectiveMethodConfig = methodConfigId.trim() || undefined;

  const queryParams = useMemo(
    () => ({
      ...(effectiveLaboratoryId ? { laboratoryId: effectiveLaboratoryId } : {}),
      ...(effectiveMethodConfig ? { methodConfigId: effectiveMethodConfig } : {}),
    }),
    [effectiveLaboratoryId, effectiveMethodConfig],
  );

  const q = useQuery({
    queryKey: ["is-summaries", variant, resourceId, queryParams],
    queryFn: () =>
      variant === "run"
        ? getRunInternalStandardSummaries(resourceId, queryParams)
        : getCalibrationGroupInternalStandardSummaries(resourceId, queryParams),
    enabled: !!resourceId && (!!labInJwt || !!laboratoryIdOverride.trim()),
  });

  const csvMut = useMutation({
    mutationFn: async () => {
      await downloadInternalStandardSummariesCsv(variant, resourceId, queryParams);
    },
  });

  const rows = Array.isArray(q.data) ? q.data : [];
  const needPlatformLab = !labInJwt;

  return (
    <Card>
      <div className="text-sm font-medium">Internal standard response summaries</div>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
        Aggregated <strong>Response</strong> statistics for internal-standard compound rows (
        {variant === "run" ? "this run" : "CAL runs linked to this group; ICV excluded"}). Optional method config
        supplies mean-response bounds for warning flags.
      </p>

      <div className="mt-4 space-y-3">
        {needPlatformLab ? (
          <div>
            <Label htmlFor="isLab">Laboratory ID (required for platform users)</Label>
            <Input
              id="isLab"
              value={laboratoryIdOverride}
              onChange={(e) => setLaboratoryIdOverride(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="mt-1 font-mono text-xs"
            />
          </div>
        ) : (
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Scoped to your laboratory from the access token.
          </p>
        )}
        <div>
          <Label htmlFor="isMc">Method config ID (optional — thresholds)</Label>
          <Input
            id="isMc"
            value={methodConfigId}
            onChange={(e) => setMethodConfigId(e.target.value)}
            placeholder="Omit for statistics only (run) or group snapshot defaults"
            className="mt-1 font-mono text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!resourceId || (needPlatformLab && !laboratoryIdOverride.trim()) || q.isFetching}
            onClick={() => void q.refetch()}
          >
            Refresh
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={csvMut.isPending || !resourceId || (needPlatformLab && !laboratoryIdOverride.trim())}
            onClick={() => csvMut.mutate()}
          >
            {csvMut.isPending ? "Downloading…" : "Download CSV"}
          </Button>
        </div>
      </div>

      <div className="mt-4">
        {q.isLoading ? <div className="text-sm">Loading…</div> : null}
        {q.isError ? <div className="text-sm text-red-600">{(q.error as Error).message}</div> : null}
        {q.isSuccess && rows.length === 0 ? (
          <div className="text-sm text-neutral-600 dark:text-neutral-400">No internal-standard rows in scope.</div>
        ) : null}
        {q.isSuccess && rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                  <th className="py-2 pr-2">Compound</th>
                  <th className="py-2 pr-2">Min</th>
                  <th className="py-2 pr-2">Max</th>
                  <th className="py-2 pr-2">Mean</th>
                  <th className="py-2 pr-2">%RSD</th>
                  <th className="py-2 pr-2">RSD limit</th>
                  <th className="py-2 pr-2">RSD pass</th>
                  <th className="py-2 pr-2">Count</th>
                  <th className="py-2 pr-2">Runs</th>
                  <th className="py-2 pr-2">Warn</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((raw, i) => {
                  const r = raw as Record<string, unknown>;
                  const warn = Boolean(r.isWarning);
                  const key = String(r.normalizedKey ?? r.rawCompoundName ?? "row");
                  return (
                    <tr key={`${key}:${i}`} className="border-b border-neutral-100 dark:border-neutral-900">
                      <td className="py-2 pr-2">{String(r.rawCompoundName ?? r.normalizedKey ?? "")}</td>
                      <td className="py-2 pr-2">{num(r.min)}</td>
                      <td className="py-2 pr-2">{num(r.max)}</td>
                      <td className="py-2 pr-2">{num(r.mean)}</td>
                      <td className="py-2 pr-2">{num(r.responseRsdPercent)}</td>
                      <td className="py-2 pr-2">{num(r.isRsdPercentLimit)}</td>
                      <td className="py-2 pr-2">
                        {r.isRsdPassed == null ? (
                          "—"
                        ) : r.isRsdPassed ? (
                          <Badge tone="ok">Pass</Badge>
                        ) : (
                          <Badge tone="bad">Fail</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-2">{num(r.count)}</td>
                      <td className="py-2 pr-2">
                        {r.distinctCalibrationRunCount == null ? "—" : String(r.distinctCalibrationRunCount)}
                      </td>
                      <td className="py-2 pr-2">
                        {warn ? (
                          <Badge tone="warn">Yes</Badge>
                        ) : (
                          <span className="text-neutral-500">No</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.some((raw) => {
              const m = (raw as { warningMessages?: unknown }).warningMessages;
              return Array.isArray(m) && m.length > 0;
            }) ? (
              <div className="mt-3 space-y-1 text-xs text-amber-900 dark:text-amber-100">
                {rows.map((raw, i) => {
                  const r = raw as { warningMessages?: string[]; rawCompoundName?: string; normalizedKey?: string };
                  const msgs = r.warningMessages;
                  if (!msgs?.length) return null;
                  const wkey = String(r.normalizedKey ?? r.rawCompoundName ?? "msg");
                  return (
                    <div key={`${wkey}:${i}`}>
                      <span className="font-medium">{r.rawCompoundName ?? "Row"}:</span> {msgs.join("; ")}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
