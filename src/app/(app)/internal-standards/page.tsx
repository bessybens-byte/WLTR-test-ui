"use client";

import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { listInternalStandards } from "@/lib/api/wltr-api";
import { PERMS, hasPermission } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

export default function InternalStandardsPage() {
  const { me } = useAuth();
  const canEdit = hasPermission(me, PERMS.configEdit);
  const q = useQuery({
    queryKey: ["internal-standards"],
    queryFn: () => listInternalStandards(),
  });

  const rows = Array.isArray(q.data) ? q.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal standards"
        description="Laboratory catalog for IS normalization. Names should match how compounds appear in instrument exports."
        actions={
          canEdit ? (
            <Link href="/internal-standards/new">
              <Button>New standard</Button>
            </Link>
          ) : null
        }
      />
      <Card>
        {q.isLoading ? <div className="text-sm">Loading…</div> : null}
        {q.isError ? <div className="text-sm text-red-600">{(q.error as Error).message}</div> : null}
        {q.isSuccess && rows.length === 0 ? (
          <EmptyState
            title="No internal standards yet"
            hint={
              canEdit
                ? "Create entries here, then pick them as the default IS on analytes."
                : "Standards are managed by users with lab configuration access."
            }
          />
        ) : null}
        {q.isSuccess && rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">CAS</th>
                  <th className="py-2 pr-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const r = row as Record<string, unknown>;
                  const id = String(r.id ?? "");
                  return (
                    <tr key={id} className="border-b border-neutral-100 dark:border-neutral-900">
                      <td className="py-2 pr-3">{String(r.name ?? "")}</td>
                      <td className="py-2 pr-3">{String(r.casNumber ?? "")}</td>
                      <td className="py-2 pr-3 text-right">
                        <Link className="font-medium text-neutral-900 underline underline-offset-2 dark:text-neutral-100" href={`/internal-standards/${id}`}>
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
