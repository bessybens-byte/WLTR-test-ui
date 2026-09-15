"use client";

import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { PaginationBar } from "@/components/pagination";
import { listCalibrationLevelSets } from "@/lib/api/wltr-api";
import { hasPermission, PERMS } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

export default function CalibrationLevelSetsPage() {
  const { me } = useAuth();
  const canEdit = hasPermission(me, PERMS.configEdit);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const q = useQuery({
    queryKey: ["calibration-level-sets", page],
    queryFn: () => listCalibrationLevelSets({ page, pageSize, sort: "name:asc" }),
  });

  return (
    <div>
      <PageHeader
        title="Calibration level sets"
        description="Department-scoped ladders of calibration standards. Each method config and CAL run references one set."
        actions={
          canEdit ? (
            <Link href="/calibration-level-sets/new">
              <Button>New level set</Button>
            </Link>
          ) : null
        }
      />
      <Card>
        {q.isLoading ? <div className="text-sm">Loading…</div> : null}
        {q.isError ? <div className="text-sm text-red-600">{(q.error as Error).message}</div> : null}
        {q.isSuccess && (!q.data.items || q.data.items.length === 0) ? (
          <EmptyState title="No level sets" />
        ) : null}
        {q.isSuccess && q.data.items && q.data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Department</th>
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
                      <td className="py-2 pr-3">{String(r.departmentName ?? "—")}</td>
                      <td className="py-2 pr-3">
                        <Badge tone={active ? "ok" : "neutral"}>{active ? "Active" : "Retired"}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <Link className="underline" href={`/calibration-level-sets/${id}`}>
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
