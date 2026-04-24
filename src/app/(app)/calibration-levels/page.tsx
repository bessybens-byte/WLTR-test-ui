"use client";

import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { PaginationBar } from "@/components/pagination";
import { listCalibrationLevels } from "@/lib/api/wltr-api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

export default function CalibrationLevelsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const q = useQuery({
    queryKey: ["calibration-levels", page],
    queryFn: () => listCalibrationLevels({ page, pageSize, sort: "sortOrder:asc" }),
  });

  return (
    <div>
      <PageHeader
        title="Calibration levels"
        actions={
          <Link href="/calibration-levels/new">
            <Button>New level</Button>
          </Link>
        }
      />
      <Card>
        {q.isLoading ? <div className="text-sm">Loading…</div> : null}
        {q.isError ? <div className="text-sm text-red-600">{(q.error as Error).message}</div> : null}
        {q.isSuccess && (!q.data.items || q.data.items.length === 0) ? <EmptyState title="No levels" /> : null}
        {q.isSuccess && q.data.items && q.data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">True conc.</th>
                  <th className="py-2 pr-3">Sort</th>
                  <th className="py-2 pr-3" />
                </tr>
              </thead>
              <tbody>
                {q.data.items!.map((row) => {
                  const r = row as Record<string, unknown>;
                  const id = String(r.id ?? "");
                  return (
                    <tr key={id} className="border-b border-neutral-100 dark:border-neutral-900">
                      <td className="py-2 pr-3">{String(r.levelName ?? "")}</td>
                      <td className="py-2 pr-3">{String(r.trueConcentration ?? "")}</td>
                      <td className="py-2 pr-3">{String(r.sortOrder ?? "")}</td>
                      <td className="py-2 pr-3 text-right">
                        <Link className="underline" href={`/calibration-levels/${id}`}>
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-4">
              <PaginationBar page={page} pageSize={pageSize} totalCount={q.data.totalCount} onPageChange={setPage} />
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
