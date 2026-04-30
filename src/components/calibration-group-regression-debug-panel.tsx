"use client";

import { JsonPrettyView } from "@/components/json-pretty-view";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import {
  getCalibrationGroupRegressionDebug,
  getCalibrationGroupRegressionInputs,
} from "@/lib/api/wltr-api";
import type { MeResponse } from "@/lib/types/wltr";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

function cellStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

export function CalibrationGroupRegressionDebugPanel({
  groupId,
  me,
}: {
  readonly groupId: string;
  readonly me: MeResponse | null | undefined;
}) {
  const labInJwt = me?.laboratoryId;
  const [laboratoryIdOverride, setLaboratoryIdOverride] = useState("");
  const [selectedAnalyteId, setSelectedAnalyteId] = useState("");
  const needPlatformLab = !labInJwt;

  const effectiveLaboratoryId = labInJwt || laboratoryIdOverride.trim() || undefined;
  const debugParams = useMemo(
    () => (effectiveLaboratoryId ? { laboratoryId: effectiveLaboratoryId } : undefined),
    [effectiveLaboratoryId],
  );

  const inputsQ = useQuery({
    queryKey: ["calibration-group-regression-inputs", groupId],
    queryFn: () => getCalibrationGroupRegressionInputs(groupId),
    enabled: !!groupId,
  });

  const analyteChoices = useMemo(() => {
    const rows = Array.isArray(inputsQ.data) ? inputsQ.data : [];
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
  }, [inputsQ.data]);

  const debugMut = useMutation({
    mutationFn: (analyteId: string) => getCalibrationGroupRegressionDebug(groupId, analyteId, debugParams),
  });

  const canLoad =
    !!groupId &&
    !!selectedAnalyteId &&
    (!needPlatformLab || !!laboratoryIdOverride.trim());

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
              . Requires a computed curve — expect{" "}
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

        <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <Label htmlFor="rdAnalyte">Analyte</Label>
            <Select
              id="rdAnalyte"
              className="mt-1"
              value={selectedAnalyteId}
              disabled={inputsQ.isLoading || analyteChoices.length === 0}
              onChange={(e) => setSelectedAnalyteId(e.target.value)}
            >
              <option value="">
                {inputsQ.isLoading ? "Loading…" : analyteChoices.length ? "Select analyte…" : "No analytes"}
              </option>
              {analyteChoices.map((c) => (
                <option key={c.analyteId} value={c.analyteId}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
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
              disabled={!canLoad || debugMut.isPending}
              onClick={() => selectedAnalyteId && void debugMut.mutateAsync(selectedAnalyteId)}
            >
              {debugMut.isPending ? "Loading…" : "Load snapshot"}
            </Button>
          </div>
        </div>

        {debugMut.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {(debugMut.error as Error).message}
          </div>
        ) : null}

        {debugMut.isSuccess && debugMut.data ? (
          <JsonPrettyView
            value={debugMut.data}
            title="Regression snapshot"
            subtitle={
              <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                Analyte <span className="text-neutral-700 dark:text-neutral-300">{selectedAnalyteId}</span>
              </span>
            }
          />
        ) : null}
      </div>
    </Card>
  );
}
