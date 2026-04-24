"use client";

import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { PaginationBar } from "@/components/pagination";
import { listLaboratories } from "@/lib/api/wltr-api";
import { PERMS, hasPermission } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

export default function LaboratoriesPage() {
  const { me } = useAuth();
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const q = useQuery({
    queryKey: ["laboratories", page],
    queryFn: () => listLaboratories({ page, pageSize, sort: "name:asc" }),
  });

  const canCreate = hasPermission(me, PERMS.laboratoriesCreate);

  return (
    <div>
      <PageHeader
        title="Laboratories"
        description="Laboratory directory (scoped by your access)."
        actions={
          canCreate ? (
            <Link href="/laboratories/new">
              <Button>New laboratory</Button>
            </Link>
          ) : null
        }
      />
      <Card>
        {q.isLoading ? <div className="text-sm">Loading…</div> : null}
        {q.isError ? <div className="text-sm text-red-600">{(q.error as Error).message}</div> : null}
        {q.isSuccess && (!q.data.items || q.data.items.length === 0) ? (
          <EmptyState title="No laboratories" hint="You may not have access to list multiple labs." />
        ) : null}
        {q.isSuccess && q.data.items && q.data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">City</th>
                  <th className="py-2 pr-3">State</th>
                  <th className="py-2 pr-3">Active</th>
                  <th className="py-2 pr-3" />
                </tr>
              </thead>
              <tbody>
                {q.data.items!.map((row) => {
                  const r = row as Record<string, unknown>;
                  const id = String(r.id ?? "");
                  return (
                    <tr key={id} className="border-b border-neutral-100 dark:border-neutral-900">
                      <td className="py-2 pr-3">{String(r.name ?? "")}</td>
                      <td className="py-2 pr-3">{String(r.city ?? "")}</td>
                      <td className="py-2 pr-3">{String(r.state ?? "")}</td>
                      <td className="py-2 pr-3">{String(r.isActive ?? "")}</td>
                      <td className="py-2 pr-3 text-right">
                        <Link className="underline" href={`/laboratories/${id}`}>
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
