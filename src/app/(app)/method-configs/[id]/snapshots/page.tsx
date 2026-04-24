"use client";

import { Card, PageHeader } from "@/components/ui";
import { PaginationBar } from "@/components/pagination";
import { listMethodConfigSnapshots } from "@/lib/api/wltr-api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function MethodConfigSnapshotsPage() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const q = useQuery({
    queryKey: ["method-config-snapshots", id, page],
    queryFn: () => listMethodConfigSnapshots(id, { page, pageSize }),
    enabled: !!id,
  });

  return (
    <div>
      <PageHeader title="Method config snapshots" description={id} />
      <Card>
        {q.isLoading ? <div className="text-sm">Loading…</div> : null}
        {q.isError ? <div className="text-sm text-red-600">{(q.error as Error).message}</div> : null}
        {q.isSuccess && q.data.items && q.data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                  <th className="py-2 pr-3">Version</th>
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2 pr-3" />
                </tr>
              </thead>
              <tbody>
                {q.data.items!.map((row) => {
                  const r = row as Record<string, unknown>;
                  const v = Number(r.version ?? 0);
                  return (
                    <tr key={v} className="border-b border-neutral-100 dark:border-neutral-900">
                      <td className="py-2 pr-3">{String(v)}</td>
                      <td className="py-2 pr-3">{String(r.createdAt ?? "")}</td>
                      <td className="py-2 pr-3 text-right">
                        <Link className="underline" href={`/method-configs/${id}/snapshots/${v}`}>
                          View
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
        {q.isSuccess && (!q.data.items || q.data.items.length === 0) ? (
          <div className="text-sm text-neutral-600 dark:text-neutral-400">No snapshots.</div>
        ) : null}
      </Card>
    </div>
  );
}
