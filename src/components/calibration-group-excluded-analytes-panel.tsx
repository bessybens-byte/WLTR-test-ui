"use client";

import { ViewOnlyNotice } from "@/components/view-only-notice";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import {
  excludeGroupAnalyte,
  listAnalytes,
  listExcludedGroupAnalytes,
  removeExcludedGroupAnalyte,
} from "@/lib/api/wltr-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

type ExcludedRow = {
  id: string;
  analyteId: string;
  analyteName: string;
  note: string | null;
  excludedAt: string | null;
};

function parseExcluded(rows: Record<string, unknown>[]): ExcludedRow[] {
  return rows
    .map((row) => {
      const analyteId = typeof row.analyteId === "string" ? row.analyteId : "";
      if (!analyteId) return null;
      return {
        id: typeof row.id === "string" ? row.id : analyteId,
        analyteId,
        analyteName: typeof row.analyteName === "string" ? row.analyteName : analyteId,
        note: typeof row.note === "string" && row.note ? row.note : null,
        excludedAt: typeof row.excludedAt === "string" ? row.excludedAt : null,
      };
    })
    .filter((r): r is ExcludedRow => r !== null);
}

export function CalibrationGroupExcludedAnalytesPanel({
  groupId,
  canEdit,
}: {
  readonly groupId: string;
  readonly canEdit: boolean;
}) {
  const qc = useQueryClient();
  const [analyteId, setAnalyteId] = useState("");
  const [note, setNote] = useState("");

  const excludedQuery = useQuery({
    queryKey: ["calibration-group-excluded-analytes", groupId],
    queryFn: () => listExcludedGroupAnalytes(groupId),
    enabled: Boolean(groupId),
  });

  const analytesQuery = useQuery({
    queryKey: ["analytes", "picker", 1],
    queryFn: () => listAnalytes({ page: 1, pageSize: 100, sort: "name:asc" }),
    enabled: canEdit,
  });

  const excluded = useMemo(() => parseExcluded(excludedQuery.data ?? []), [excludedQuery.data]);
  const excludedIds = useMemo(() => new Set(excluded.map((r) => r.analyteId)), [excluded]);

  const catalogOptions = useMemo(() => {
    const items = analytesQuery.data?.items ?? [];
    return items
      .map((row) => {
        const r = row as Record<string, unknown>;
        const id = typeof r.id === "string" ? r.id : "";
        if (!id || excludedIds.has(id)) return null;
        return {
          id,
          name: typeof r.name === "string" ? r.name : id,
        };
      })
      .filter((o): o is { id: string; name: string } => o !== null);
  }, [analytesQuery.data, excludedIds]);

  const add = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { analyteId };
      if (note.trim()) body.note = note.trim();
      await excludeGroupAnalyte(groupId, body);
    },
    onSuccess: async () => {
      setAnalyteId("");
      setNote("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["calibration-group-excluded-analytes", groupId] }),
        qc.invalidateQueries({ queryKey: ["calibration-groups", groupId] }),
      ]);
    },
  });

  const remove = useMutation({
    mutationFn: async (targetAnalyteId: string) => removeExcludedGroupAnalyte(groupId, targetAnalyteId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["calibration-group-excluded-analytes", groupId] }),
        qc.invalidateQueries({ queryKey: ["calibration-groups", groupId] }),
      ]);
    },
  });

  return (
    <Card>
      <div className="text-sm font-medium">Excluded analytes (regression)</div>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
        Analytes on this list are skipped during regression compute for this calibration group. The exclusion list
        is kept when you change run membership; recompute after changes. Requires{" "}
        <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">perm.runs.upload</code>.
      </p>

      {excludedQuery.isLoading ? <div className="mt-3 text-sm text-neutral-500">Loading exclusions…</div> : null}
      {excludedQuery.isError ? (
        <div className="mt-3 text-sm text-red-600">{(excludedQuery.error as Error).message}</div>
      ) : null}

      {excludedQuery.isSuccess ? (
        excluded.length ? (
          <ul className="mt-4 space-y-2">
            {excluded.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800"
              >
                <div className="min-w-0 text-sm">
                  <Link
                    href={`/analytes/${encodeURIComponent(row.analyteId)}`}
                    className="font-medium text-blue-600 underline dark:text-blue-400"
                  >
                    {row.analyteName}
                  </Link>
                  {row.note ? (
                    <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{row.note}</p>
                  ) : null}
                  {row.excludedAt ? (
                    <p className="mt-0.5 font-mono text-xs text-neutral-500">
                      {new Date(row.excludedAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0 text-xs"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(row.analyteId)}
                  >
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-neutral-500">No analytes excluded from this group.</p>
        )
      ) : null}

      {canEdit ? (
        <form
          className="mt-6 space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-800"
          onSubmit={(e) => {
            e.preventDefault();
            if (!analyteId) return;
            add.mutate();
          }}
        >
          <div className="text-sm font-medium">Exclude analyte</div>
          <div>
            <Label htmlFor="exclude-group-analyte">Canonical analyte</Label>
            <Select
              id="exclude-group-analyte"
              value={analyteId}
              onChange={(e) => setAnalyteId(e.target.value)}
              disabled={analytesQuery.isLoading}
            >
              <option value="">Select an analyte…</option>
              {catalogOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="exclude-group-note">Note (optional)</Label>
            <Input
              id="exclude-group-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why this analyte is excluded from regression"
            />
          </div>
          {(add.isError || remove.isError) && (
            <div className="text-sm text-red-600">{((add.error ?? remove.error) as Error).message}</div>
          )}
          <Button type="submit" disabled={add.isPending || !analyteId}>
            {add.isPending ? "Excluding…" : "Exclude analyte"}
          </Button>
        </form>
      ) : (
        <div className="mt-4">
          <ViewOnlyNotice />
        </div>
      )}
    </Card>
  );
}
