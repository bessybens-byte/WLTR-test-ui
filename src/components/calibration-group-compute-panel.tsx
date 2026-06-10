"use client";

import { Button, Card, Input, Label } from "@/components/ui";
import { ApiError } from "@/lib/api/errors";
import { computeCalibrationGroup, getCalibrationGroupReadiness } from "@/lib/api/wltr-api";
import type { MeResponse } from "@/lib/types/wltr";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

export function CalibrationGroupComputePanel({
  groupId,
  me,
  canCompute,
}: {
  readonly groupId: string;
  readonly me: MeResponse | null | undefined;
  readonly canCompute: boolean;
}) {
  const qc = useQueryClient();
  const labInJwt = me?.laboratoryId;
  const [laboratoryIdOverride, setLaboratoryIdOverride] = useState("");
  const needPlatformLab = !labInJwt;

  const effectiveLaboratoryId = labInJwt || laboratoryIdOverride.trim() || undefined;
  const scopeParams = useMemo(
    () => (effectiveLaboratoryId ? { laboratoryId: effectiveLaboratoryId } : undefined),
    [effectiveLaboratoryId],
  );

  const readiness = useQuery({
    queryKey: ["calibration-group-readiness", groupId, scopeParams],
    queryFn: () => getCalibrationGroupReadiness(groupId, scopeParams),
    enabled: Boolean(groupId && effectiveLaboratoryId),
  });

  const mut = useMutation({
    mutationFn: () => computeCalibrationGroup(groupId, scopeParams),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["calibration-groups", groupId] }),
        qc.invalidateQueries({ queryKey: ["calibration-group-regression-inputs", groupId] }),
        qc.invalidateQueries({ queryKey: ["calibration-group-readiness", groupId] }),
        qc.invalidateQueries({ queryKey: ["calibration-group-regression-debug", groupId] }),
        qc.invalidateQueries({ queryKey: ["calibration-group-chart", groupId] }),
        qc.invalidateQueries({ queryKey: ["calibration-group-report-card", groupId] }),
      ]);
    },
  });

  const waitForReadiness = Boolean(effectiveLaboratoryId) && (readiness.isLoading || readiness.isFetching);

  const readinessBlocks =
    Boolean(effectiveLaboratoryId) &&
    readiness.isSuccess &&
    Boolean(readiness.data && (readiness.data as { isReady?: boolean }).isReady === false);

  const missingPlatformLab = needPlatformLab && !laboratoryIdOverride.trim();

  const computeDisabled =
    !canCompute || mut.isPending || waitForReadiness || readinessBlocks || missingPlatformLab;

  return (
    <Card>
      <div className="text-sm font-medium">Run regression</div>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
        Computes all supported regression and weighting variants for every analyte in one pass. Requires{" "}
        <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">perm.runs.upload</code>. Recompute clears
        manual point exclusions and any prior model selection.
      </p>

      {needPlatformLab ? (
        <div className="mt-4">
          <Label htmlFor="computeLab">Laboratory ID (required for platform users)</Label>
          <Input
            id="computeLab"
            value={laboratoryIdOverride}
            onChange={(e) => setLaboratoryIdOverride(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="mt-1 font-mono text-xs"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Use the same laboratory ID as readiness and charts — compute is scoped to that lab.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-xs text-neutral-600 dark:text-neutral-400">
          Scoped to your laboratory from the access token.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" disabled={computeDisabled} onClick={() => mut.mutate()}>
          {mut.isPending ? "Computing…" : "Compute calibration"}
        </Button>
        {readinessBlocks ? (
          <span className="text-xs text-amber-700 dark:text-amber-400">
            Readiness check reports blocking issues — resolve them before computing.
          </span>
        ) : null}
        {missingPlatformLab ? (
          <span className="text-xs text-amber-700 dark:text-amber-400">
            Enter the group&apos;s laboratory ID before computing.
          </span>
        ) : null}
      </div>
      {mut.isError ? (
        <div className="mt-2 text-sm text-red-600">
          {(mut.error as Error).message}
          {mut.error instanceof ApiError && mut.error.status === 404 ? (
            <p className="mt-1 text-xs">
              404 usually means the group is outside your laboratory scope, or (for platform users) the laboratory ID was
              not supplied or does not match the group&apos;s instrument lab.
            </p>
          ) : null}
        </div>
      ) : null}
      {mut.isSuccess ? (
        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
          Regression completed. Refresh regression inputs and charts below.
        </p>
      ) : null}
    </Card>
  );
}
