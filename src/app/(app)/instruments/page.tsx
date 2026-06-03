"use client";

import { Button, Card, Input, Label, PageHeader, Select } from "@/components/ui";
import { listInstruments } from "@/lib/api/wltr-api";
import { hasPermission, PERMS } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
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
  const { me } = useAuth();
  const canEdit = hasPermission(me, PERMS.configEdit);
  const [page, setPage] = useState(1);
  const [isActiveFilter, setIsActiveFilter] = useState<"" | "true" | "false">("");
  const [instrumentTypeFilter, setInstrumentTypeFilter] = useState("");

  const instrumentsQuery = useQuery({
    queryKey: ["instruments", "list", page, isActiveFilter, instrumentTypeFilter],
    queryFn: async () => {
      const res = await listInstruments({
        page,
        pageSize: 25,
        sort: "name:asc",
        isActive: isActiveFilter === "" ? undefined : isActiveFilter === "true",
        instrumentType: instrumentTypeFilter.trim() || undefined,
      });
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Instruments"
        description="Instruments registered in your laboratory."
        actions={
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Link href="/instruments/new">
                <Button type="button">New instrument</Button>
              </Link>
            ) : null}
            <Link href="/runs/upload">
              <Button variant="secondary" type="button">
                Upload run
              </Button>
            </Link>
          </div>
        }
      />

      <Card>
        <div className="mb-4 text-sm font-medium">Filters</div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <Label htmlFor="filter-active">Active status</Label>
            <Select
              id="filter-active"
              value={isActiveFilter}
              onChange={(e) => {
                setIsActiveFilter(e.target.value as "" | "true" | "false");
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="true">Active only</option>
              <option value="false">Inactive only</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="filter-type">Instrument type</Label>
            <Input
              id="filter-type"
              placeholder="e.g. GC/MS"
              value={instrumentTypeFilter}
              onChange={(e) => {
                setInstrumentTypeFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setIsActiveFilter("");
                setInstrumentTypeFilter("");
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          </div>
        </div>
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
          <div className="text-sm text-red-600">{(instrumentsQuery.error as Error).message}</div>
        ) : null}

        {items.length === 0 && instrumentsQuery.isSuccess ? (
          <div className="text-sm text-neutral-500">No instruments match these filters.</div>
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
                    <td className="py-2 pr-4 font-medium">
                      <Link className="text-blue-600 underline dark:text-blue-400" href={`/instruments/${row.id}`}>
                        {row.name}
                      </Link>
                    </td>
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
                      <div className="flex flex-wrap gap-3">
                        <Link className="text-blue-600 underline dark:text-blue-400" href={`/instruments/${row.id}`}>
                          Details
                        </Link>
                        <Link
                          className="text-blue-600 underline dark:text-blue-400"
                          href={`/runs?instrumentId=${encodeURIComponent(row.id)}`}
                        >
                          Runs
                        </Link>
                        {hasPermission(me, PERMS.runsUpload) ? (
                          <Link
                            className="text-blue-600 underline dark:text-blue-400"
                            href={`/runs/upload?instrumentId=${encodeURIComponent(row.id)}`}
                          >
                            Upload
                          </Link>
                        ) : null}
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
