"use client";

import { Badge, Button, Card, EmptyState, PageHeader, Select, Label } from "@/components/ui";
import { PaginationBar } from "@/components/pagination";
import { listDepartments } from "@/lib/api/wltr-api";
import { PERMS, hasPermission } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

export default function DepartmentsPage() {
  const { me } = useAuth();
  const [page, setPage] = useState(1);
  const [isActiveFilter, setIsActiveFilter] = useState<"" | "true" | "false">("true");
  const pageSize = 25;
  const canManage = hasPermission(me, PERMS.departmentsManage);

  const q = useQuery({
    queryKey: ["departments", page, isActiveFilter],
    queryFn: () =>
      listDepartments({
        page,
        pageSize,
        sort: "name:asc",
        isActive: isActiveFilter === "" ? undefined : isActiveFilter === "true",
      }),
  });

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Organizational benches inside your laboratory. Soft workflow filters — not tenancy boundaries."
        actions={
          canManage ? (
            <Link href="/departments/new">
              <Button>New department</Button>
            </Link>
          ) : null
        }
      />
      <Card>
        <div className="mb-4 max-w-xs">
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

        {q.isLoading ? <div className="text-sm">Loading…</div> : null}
        {q.isError ? <div className="text-sm text-red-600">{(q.error as Error).message}</div> : null}
        {q.isSuccess && (!q.data.items || q.data.items.length === 0) ? (
          <EmptyState title="No departments" hint="Your laboratory always has at least one active department." />
        ) : null}
        {q.isSuccess && q.data.items && q.data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3" />
                </tr>
              </thead>
              <tbody>
                {q.data.items!.map((row) => {
                  const r = row as Record<string, unknown>;
                  const id = String(r.id ?? "");
                  const active = Boolean(r.isActive);
                  return (
                    <tr key={id} className="border-b border-neutral-100 dark:border-neutral-900">
                      <td className="py-2 pr-3">{String(r.name ?? "")}</td>
                      <td className="py-2 pr-3">
                        <Badge tone={active ? "ok" : "neutral"}>{active ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <Link className="underline" href={`/departments/${id}`}>
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
