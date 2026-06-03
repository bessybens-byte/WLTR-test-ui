"use client";

import { ViewOnlyNotice } from "@/components/view-only-notice";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import {
  listAnalytes,
  listSuppressedInstrumentAnalytes,
  removeSuppressedInstrumentAnalyte,
  suppressInstrumentAnalyte,
} from "@/lib/api/wltr-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

type SuppressedRow = {
  id: string;
  analyteId: string;
  analyteName: string;
  note: string | null;
  suppressedAt: string | null;
};

function parseSuppressed(rows: Record<string, unknown>[]): SuppressedRow[] {
  return rows
    .map((row) => {
      const analyteId = typeof row.analyteId === "string" ? row.analyteId : "";
      if (!analyteId) return null;
      return {
        id: typeof row.id === "string" ? row.id : analyteId,
        analyteId,
        analyteName: typeof row.analyteName === "string" ? row.analyteName : analyteId,
        note: typeof row.note === "string" && row.note ? row.note : null,
        suppressedAt: typeof row.suppressedAt === "string" ? row.suppressedAt : null,
      };
    })
    .filter((r): r is SuppressedRow => r !== null);
}

export function InstrumentSuppressedAnalytesPanel({
  instrumentId,
  canEdit,
}: {
  readonly instrumentId: string;
  readonly canEdit: boolean;
}) {
  const qc = useQueryClient();
  const [analyteId, setAnalyteId] = useState("");
  const [note, setNote] = useState("");

  const suppressedQuery = useQuery({
    queryKey: ["instrument-suppressed-analytes", instrumentId],
    queryFn: () => listSuppressedInstrumentAnalytes(instrumentId),
    enabled: Boolean(instrumentId),
  });

  const analytesQuery = useQuery({
    queryKey: ["analytes", "picker", 1],
    queryFn: () => listAnalytes({ page: 1, pageSize: 100, sort: "name:asc" }),
    enabled: canEdit,
  });

  const suppressed = useMemo(
    () => parseSuppressed(suppressedQuery.data ?? []),
    [suppressedQuery.data],
  );
  const suppressedIds = useMemo(() => new Set(suppressed.map((s) => s.analyteId)), [suppressed]);

  const catalogOptions = useMemo(() => {
    const items = analytesQuery.data?.items ?? [];
    return items
      .map((row) => {
        const r = row as Record<string, unknown>;
        const id = typeof r.id === "string" ? r.id : "";
        if (!id || suppressedIds.has(id)) return null;
        return {
          id,
          name: typeof r.name === "string" ? r.name : id,
        };
      })
      .filter((o): o is { id: string; name: string } => o !== null);
  }, [analytesQuery.data, suppressedIds]);

  const add = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { analyteId };
      if (note.trim()) body.note = note.trim();
      await suppressInstrumentAnalyte(instrumentId, body);
    },
    onSuccess: async () => {
      setAnalyteId("");
      setNote("");
      await qc.invalidateQueries({ queryKey: ["instrument-suppressed-analytes", instrumentId] });
    },
  });

  const remove = useMutation({
    mutationFn: async (targetAnalyteId: string) => removeSuppressedInstrumentAnalyte(instrumentId, targetAnalyteId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["instrument-suppressed-analytes", instrumentId] });
    },
  });

  return (
    <Card>
      <div className="text-sm font-medium">Suppressed analytes</div>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
        Canonical analytes on this list are skipped when new runs are uploaded to this instrument. Existing runs are
        not changed — suppression applies to future uploads only.
      </p>

      {suppressedQuery.isLoading ? <div className="mt-3 text-sm text-neutral-500">Loading suppressions…</div> : null}
      {suppressedQuery.isError ? (
        <div className="mt-3 text-sm text-red-600">{(suppressedQuery.error as Error).message}</div>
      ) : null}

      {suppressedQuery.isSuccess ? (
        suppressed.length ? (
          <ul className="mt-4 space-y-2">
            {suppressed.map((row) => (
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
                  {row.suppressedAt ? (
                    <p className="mt-0.5 font-mono text-xs text-neutral-500">
                      {new Date(row.suppressedAt).toLocaleString()}
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
          <p className="mt-4 text-sm text-neutral-500">No analytes suppressed on this instrument.</p>
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
          <div className="text-sm font-medium">Add suppression</div>
          <div>
            <Label htmlFor="suppress-analyte">Canonical analyte</Label>
            <Select
              id="suppress-analyte"
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
            {analytesQuery.isError ? (
              <p className="mt-1 text-xs text-red-600">{(analytesQuery.error as Error).message}</p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="suppress-note">Note (optional)</Label>
            <Input
              id="suppress-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why this analyte is suppressed on this instrument"
            />
          </div>
          {(add.isError || remove.isError) && (
            <div className="text-sm text-red-600">{((add.error ?? remove.error) as Error).message}</div>
          )}
          <Button type="submit" disabled={add.isPending || !analyteId}>
            {add.isPending ? "Adding…" : "Suppress analyte"}
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
