"use client";

import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { createInstrument, listInstruments } from "@/lib/api/wltr-api";
import { pushRecentInstrument } from "@/lib/client-recent";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

function s(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

type InstrumentRow = {
  id: string;
  name: string;
  instrumentType: string | null;
  isActive: boolean;
};

export default function InstrumentsPage() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const instrumentsQuery = useQuery({
    queryKey: ["instruments", "list", page],
    queryFn: async () => {
      const res = await listInstruments({ page, pageSize: 25, sort: "name:asc" });
      return res;
    },
  });

  const items: InstrumentRow[] = (instrumentsQuery.data?.items ?? []).map((r) => ({
    id: s(r.id),
    name: s(r.name, "(unnamed)"),
    instrumentType: typeof r.instrumentType === "string" ? r.instrumentType : null,
    isActive: Boolean(r.isActive),
  }));

  const totalCount = instrumentsQuery.data?.totalCount ?? 0;
  const pageSize = instrumentsQuery.data?.pageSize ?? 25;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  async function onSubmit() {
    setBusy(true);
    setError(null);
    setCreatedId(null);
    try {
      const res = await createInstrument({ name });
      const id = s((res as { id?: unknown }).id);
      setCreatedId(id);
      pushRecentInstrument(id);
      setName("");
      void instrumentsQuery.refetch();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Instruments"
        description="Instruments registered in your laboratory."
        actions={
          <Link href="/runs/upload">
            <Button variant="secondary" type="button">Upload run</Button>
          </Link>
        }
      />

      <Card>
        <div className="mb-4 text-sm font-medium">Register new instrument</div>
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); void onSubmit(); }}>
          <div className="flex-1">
            <Label htmlFor="name">Instrument name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1" />
          </div>
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? "Registering…" : "Register"}
          </Button>
        </form>
        {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
        {createdId ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950">
            Created: <span className="font-mono">{createdId}</span>
            {" — "}
            <Link className="underline" href={`/runs/upload?instrumentId=${encodeURIComponent(createdId)}`}>
              Upload run for this instrument
            </Link>
          </div>
        ) : null}
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-medium">
            {instrumentsQuery.isLoading ? "Loading instruments…" : `Instruments (${totalCount})`}
          </div>
          <Button variant="secondary" onClick={() => void instrumentsQuery.refetch()} type="button">
            Refresh
          </Button>
        </div>

        {instrumentsQuery.isError ? (
          <div className="text-sm text-red-600">Failed to load instruments.</div>
        ) : null}

        {items.length === 0 && instrumentsQuery.isSuccess ? (
          <div className="text-sm text-neutral-500">No instruments registered yet.</div>
        ) : null}

        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="pb-2 text-left font-medium">Name</th>
                  <th className="pb-2 text-left font-medium">Type</th>
                  <th className="pb-2 text-left font-medium">Status</th>
                  <th className="pb-2 text-left font-medium">ID</th>
                  <th className="pb-2 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                {items.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-4 font-medium">{row.name}</td>
                    <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400">{row.instrumentType ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          row.isActive
                            ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                            : "inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                        }
                      >
                        {row.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                      {row.id.slice(0, 8)}…
                    </td>
                    <td className="py-2">
                      <div className="flex gap-3">
                        <Link
                          className="text-blue-600 underline dark:text-blue-400"
                          href={`/runs?instrumentId=${encodeURIComponent(row.id)}`}
                        >
                          View runs
                        </Link>
                        <Link
                          className="text-blue-600 underline dark:text-blue-400"
                          href={`/runs/upload?instrumentId=${encodeURIComponent(row.id)}`}
                        >
                          Upload run
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {totalPages > 1 ? (
          <div className="mt-4 flex items-center gap-3 text-sm">
            <Button
              variant="secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              type="button"
            >
              Previous
            </Button>
            <span className="text-neutral-600 dark:text-neutral-400">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              type="button"
            >
              Next
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
