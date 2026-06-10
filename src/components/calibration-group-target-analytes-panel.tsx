"use client";

import { Badge, Button, Card } from "@/components/ui";
import {
  excludeGroupAnalyte,
  listTargetGroupAnalytes,
  removeExcludedGroupAnalyte,
} from "@/lib/api/wltr-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";

type TargetAnalyteRow = {
  analyteId: string;
  analyteName: string;
  isExcluded: boolean;
};

function parseTargetAnalytes(rows: Record<string, unknown>[]): TargetAnalyteRow[] {
  return rows
    .map((row) => {
      const analyteId = typeof row.analyteId === "string" ? row.analyteId : "";
      if (!analyteId) return null;
      return {
        analyteId,
        analyteName: typeof row.analyteName === "string" ? row.analyteName : analyteId,
        isExcluded: Boolean(row.isExcluded),
      };
    })
    .filter((r): r is TargetAnalyteRow => r !== null);
}

export function CalibrationGroupTargetAnalytesPanel({
  groupId,
  canEdit,
}: {
  readonly groupId: string;
  readonly canEdit: boolean;
}) {
  const qc = useQueryClient();

  const targetQuery = useQuery({
    queryKey: ["calibration-group-target-analytes", groupId],
    queryFn: () => listTargetGroupAnalytes(groupId),
    enabled: Boolean(groupId),
  });

  const analytes = useMemo(() => parseTargetAnalytes(targetQuery.data ?? []), [targetQuery.data]);

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["calibration-group-target-analytes", groupId] }),
      qc.invalidateQueries({ queryKey: ["calibration-group-excluded-analytes", groupId] }),
      qc.invalidateQueries({ queryKey: ["calibration-groups", groupId] }),
    ]);
  };

  const exclude = useMutation({
    mutationFn: (analyteId: string) => excludeGroupAnalyte(groupId, { analyteId }),
    onSuccess: invalidate,
  });

  const reinclude = useMutation({
    mutationFn: (analyteId: string) => removeExcludedGroupAnalyte(groupId, analyteId),
    onSuccess: invalidate,
  });

  const mutationError = exclude.error ?? reinclude.error;
  const isPending = exclude.isPending || reinclude.isPending;

  const includedCount = analytes.filter((a) => !a.isExcluded).length;
  const excludedCount = analytes.filter((a) => a.isExcluded).length;

  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="text-sm font-medium">Target analytes</div>
        {analytes.length > 0 ? (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>{includedCount} included</span>
            {excludedCount > 0 ? <span>· {excludedCount} excluded</span> : null}
          </div>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
        Distinct resolved target analytes found in this group&apos;s CAL runs. Excluded analytes are
        skipped during regression compute.{" "}
        {canEdit ? "Toggle an analyte's exclusion state below." : null}
      </p>

      {targetQuery.isLoading ? (
        <div className="mt-3 text-sm text-neutral-500">Loading analytes…</div>
      ) : null}
      {targetQuery.isError ? (
        <div className="mt-3 text-sm text-red-600">{(targetQuery.error as Error).message}</div>
      ) : null}

      {targetQuery.isSuccess ? (
        analytes.length ? (
          <ul className="mt-4 space-y-1.5">
            {analytes.map((row) => (
              <li
                key={row.analyteId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {row.isExcluded ? (
                    <Badge tone="warn" className="shrink-0">
                      Excluded
                    </Badge>
                  ) : null}
                  <Link
                    href={`/analytes/${encodeURIComponent(row.analyteId)}`}
                    className="truncate text-sm text-blue-600 underline dark:text-blue-400"
                  >
                    {row.analyteName}
                  </Link>
                </div>
                {canEdit ? (
                  row.isExcluded ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="shrink-0 text-xs"
                      disabled={isPending}
                      onClick={() => reinclude.mutate(row.analyteId)}
                    >
                      Re-include
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      className="shrink-0 text-xs"
                      disabled={isPending}
                      onClick={() => exclude.mutate(row.analyteId)}
                    >
                      Exclude
                    </Button>
                  )
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-neutral-500">
            No resolved target analytes found in this group&apos;s CAL runs yet.
          </p>
        )
      ) : null}

      {mutationError ? (
        <div className="mt-3 text-sm text-red-600">{(mutationError as Error).message}</div>
      ) : null}
    </Card>
  );
}
