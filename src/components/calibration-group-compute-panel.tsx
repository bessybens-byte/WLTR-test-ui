"use client";

import { Button, Card } from "@/components/ui";
import { computeCalibrationGroup, getCalibrationGroupReadiness } from "@/lib/api/wltr-api";
import type { MeResponse } from "@/lib/types/wltr";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

  const readinessParams = labInJwt ? { laboratoryId: labInJwt } : undefined;

  const readiness = useQuery({
    queryKey: ["calibration-group-readiness", groupId, readinessParams],
    queryFn: () => getCalibrationGroupReadiness(groupId, readinessParams),
    enabled: Boolean(groupId && labInJwt),
  });

  const mut = useMutation({
    mutationFn: () => computeCalibrationGroup(groupId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["calibration-groups", groupId] }),
        qc.invalidateQueries({ queryKey: ["calibration-group-regression-inputs", groupId] }),
        qc.invalidateQueries({ queryKey: ["calibration-group-readiness", groupId] }),
        qc.invalidateQueries({ queryKey: ["calibration-group-regression-debug", groupId] }),
        qc.invalidateQueries({ queryKey: ["calibration-group-chart", groupId] }),
      ]);
    },
  });

  const waitForReadiness = Boolean(labInJwt) && (readiness.isLoading || readiness.isFetching);

  const readinessBlocks =
    Boolean(labInJwt) &&
    readiness.isSuccess &&
    Boolean(readiness.data && (readiness.data as { isReady?: boolean }).isReady === false);

  const computeDisabled = !canCompute || mut.isPending || waitForReadiness || readinessBlocks;

  return (
    <Card>
      <div className="text-sm font-medium">Run regression</div>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
        Runs weighted least-squares for every analyte (`POST /api/calibration-groups/&#123;id&#125;/compute`). Requires{" "}
        <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">perm.runs.upload</code>. Recompute clears
        manual point exclusions.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" disabled={computeDisabled} onClick={() => mut.mutate()}>
          {mut.isPending ? "Computing…" : "Compute calibration"}
        </Button>
        {readinessBlocks ? (
          <span className="text-xs text-amber-700 dark:text-amber-400">
            Readiness check reports blocking issues — resolve them before computing.
          </span>
        ) : null}
        {!labInJwt ? (
          <span className="text-xs text-neutral-500">
            Platform operators: pass laboratory scope on readiness and related endpoints when required.
          </span>
        ) : null}
      </div>
      {mut.isError ? <div className="mt-2 text-sm text-red-600">{(mut.error as Error).message}</div> : null}
      {mut.isSuccess ? (
        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
          Regression completed. Refresh regression inputs and charts below.
        </p>
      ) : null}
    </Card>
  );
}
