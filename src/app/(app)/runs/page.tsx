"use client";

import { Badge, Button, Card, Label, PageHeader, Select } from "@/components/ui";
import { listInstruments, listRuns } from "@/lib/api/wltr-api";
import { RUN_STATUS_LABEL, RUN_TYPE_LABEL } from "@/lib/types/wltr";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

function s(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function runStatusTone(status: number): "ok" | "warn" | "bad" | "neutral" {
  if (status === 0) return "ok";
  if (status === 1) return "warn";
  if (status === 2) return "bad";
  return "neutral";
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

type RunRow = {
  id: string;
  instrumentId: string;
  runType: number;
  runDate: string;
  status: number;
  calibrationLevelId: string | null;
  name: string | null;
};

function RunsList() {
  const router = useRouter();
  const sp = useSearchParams();

  const [filters, setFilters] = useState({
    instrumentId: sp.get("instrumentId") ?? "",
    runType: "",
    status: "",
    page: 1,
  });

  const instrumentsQuery = useQuery({
    queryKey: ["instruments", "picker"],
    queryFn: () => listInstruments({ pageSize: 100, sort: "name:asc" }),
  });

  const instrumentOptions = useMemo(
    () =>
      (instrumentsQuery.data?.items ?? []).map((r) => ({
        id: s(r.id),
        name: s(r.name, s(r.id)),
      })),
    [instrumentsQuery.data],
  );

  const queryParams = useMemo(() => {
    const p: Record<string, string | number> = { page: filters.page, pageSize: 25, sort: "runDate:desc" };
    if (filters.instrumentId) p.instrumentId = filters.instrumentId;
    if (filters.runType) p.runType = filters.runType;
    if (filters.status) p.status = filters.status;
    return p;
  }, [filters]);

  const runsQuery = useQuery({
    queryKey: ["runs", "list", queryParams],
    queryFn: () => listRuns(queryParams as Parameters<typeof listRuns>[0]),
  });

  const items: RunRow[] = (runsQuery.data?.items ?? []).map((r) => ({
    id: s(r.id),
    instrumentId: s(r.instrumentId),
    runType: typeof r.runType === "number" ? r.runType : 0,
    runDate: s(r.runDate),
    status: typeof r.status === "number" ? r.status : 0,
    calibrationLevelId: typeof r.calibrationLevelId === "string" ? r.calibrationLevelId : null,
    name: typeof r.name === "string" && r.name.trim() ? r.name.trim() : null,
  }));

  const totalCount = runsQuery.data?.totalCount ?? 0;
  const pageSize = runsQuery.data?.pageSize ?? 25;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasFilters = !!(filters.instrumentId || filters.runType || filters.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Runs"
        description="Calibration and ICV runs in your laboratory."
        actions={
          <Link href="/runs/upload">
            <Button>Upload run</Button>
          </Link>
        }
      />

      <Card>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <Label htmlFor="filterInstrument">Instrument</Label>
            <Select
              id="filterInstrument"
              className="mt-1 min-w-[180px]"
              value={filters.instrumentId}
              onChange={(e) => setFilters({ ...filters, instrumentId: e.target.value, page: 1 })}
            >
              <option value="">All instruments</option>
              {instrumentOptions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="filterType">Run type</Label>
            <Select
              id="filterType"
              className="mt-1"
              value={filters.runType}
              onChange={(e) => setFilters({ ...filters, runType: e.target.value, page: 1 })}
            >
              <option value="">All types</option>
              <option value="CAL">CAL</option>
              <option value="ICV">ICV</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="filterStatus">Status</Label>
            <Select
              id="filterStatus"
              className="mt-1"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            >
              <option value="">All statuses</option>
              <option value="Valid">Valid</option>
              <option value="ValidWithWarnings">Valid with warnings</option>
              <option value="Invalid">Invalid</option>
            </Select>
          </div>
          {hasFilters ? (
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setFilters({ instrumentId: "", runType: "", status: "", page: 1 });
                router.replace("/runs");
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-medium">
            {runsQuery.isLoading ? "Loading runs…" : `Runs (${totalCount})`}
          </div>
          <Button variant="secondary" type="button" onClick={() => void runsQuery.refetch()}>
            Refresh
          </Button>
        </div>

        {runsQuery.isError ? <div className="text-sm text-red-600">Failed to load runs.</div> : null}

        {items.length === 0 && runsQuery.isSuccess ? (
          <div className="text-sm text-neutral-500">No runs found with the current filters.</div>
        ) : null}

        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="pb-2 text-left font-medium">Date</th>
                  <th className="pb-2 text-left font-medium">Name</th>
                  <th className="pb-2 text-left font-medium">Type</th>
                  <th className="pb-2 text-left font-medium">Status</th>
                  <th className="pb-2 text-left font-medium">Level</th>
                  <th className="pb-2 text-left font-medium">Run ID</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                {items.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-4">{formatDate(row.runDate)}</td>
                    <td className="py-2 pr-4 max-w-[200px] truncate" title={row.name ?? undefined}>
                      {row.name ?? "—"}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge tone="neutral">{RUN_TYPE_LABEL[row.runType] ?? String(row.runType)}</Badge>
                    </td>
                    <td className="py-2 pr-4">
                      <Badge tone={runStatusTone(row.status)}>
                        {RUN_STATUS_LABEL[row.status] ?? String(row.status)}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                      {row.calibrationLevelId ? `${row.calibrationLevelId.slice(0, 8)}…` : "—"}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                      {row.id.slice(0, 8)}…
                    </td>
                    <td className="py-2">
                      <Link className="text-blue-600 underline dark:text-blue-400" href={`/runs/${row.id}`}>
                        View
                      </Link>
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
              type="button"
              onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}
              disabled={filters.page <= 1}
            >
              Previous
            </Button>
            <span className="text-neutral-600 dark:text-neutral-400">
              Page {filters.page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setFilters((f) => ({ ...f, page: Math.min(totalPages, f.page + 1) }))}
              disabled={filters.page >= totalPages}
            >
              Next
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

export default function RunsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm">Loading…</div>}>
      <RunsList />
    </Suspense>
  );
}
