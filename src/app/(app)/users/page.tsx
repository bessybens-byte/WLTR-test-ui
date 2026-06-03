"use client";

import { Button, Card, EmptyState, Input, Label, PageHeader } from "@/components/ui";
import { PaginationBar } from "@/components/pagination";
import { deactivateUser, listUsers, reactivateUser } from "@/lib/api/wltr-api";
import { useAuth } from "@/providers/auth-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

export default function UsersPage() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [lab, setLab] = useState(me?.laboratoryId ?? "");
  const pageSize = 25;

  const q = useQuery({
    queryKey: ["users", page, lab],
    queryFn: () =>
      listUsers({
        page,
        pageSize,
        sort: "email:asc",
        laboratoryId: lab || undefined,
      }),
  });

  const platform = !me?.laboratoryId;

  const deactivate = useMutation({
    mutationFn: async (userId: string) => {
      await deactivateUser(userId, platform ? lab || undefined : undefined);
    },
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const reactivate = useMutation({
    mutationFn: async (userId: string) => {
      await reactivateUser(userId, platform ? lab || undefined : undefined);
    },
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  return (
    <div>
      <PageHeader title="Users" description="Manage team members in your laboratory — view accounts and activate or deactivate access." />
      {platform ? (
        <Card className="mb-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <Label htmlFor="lab">Laboratory id (required for platform actions)</Label>
              <Input id="lab" value={lab} onChange={(e) => setLab(e.target.value)} placeholder="uuid" />
            </div>
            <Button variant="secondary" type="button" onClick={() => qc.invalidateQueries({ queryKey: ["users"] })}>
              Refresh
            </Button>
          </div>
        </Card>
      ) : null}
      <Card>
        {q.isLoading ? <div className="text-sm">Loading…</div> : null}
        {q.isError ? <div className="text-sm text-red-600">{(q.error as Error).message}</div> : null}
        {q.isSuccess && (!q.data.items || q.data.items.length === 0) ? <EmptyState title="No users" /> : null}
        {q.isSuccess && q.data.items && q.data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Laboratory</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {q.data.items!.map((row) => {
                  const r = row as Record<string, unknown>;
                  const id = String(r.id ?? "");
                  return (
                    <tr key={id} className="border-b border-neutral-100 dark:border-neutral-900">
                      <td className="py-2 pr-3">
                        <Link className="font-medium text-blue-600 underline dark:text-blue-400" href={`/users/${encodeURIComponent(id)}`}>
                          {String(r.email ?? "")}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-neutral-700 dark:text-neutral-300">
                        {[r.firstName, r.lastName].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="py-2 pr-3">{String(r.laboratoryName ?? r.laboratoryId ?? "")}</td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/users/${encodeURIComponent(id)}`}>
                            <Button variant="secondary" type="button">
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="secondary"
                            type="button"
                            onClick={() => deactivate.mutate(id)}
                            disabled={deactivate.isPending}
                          >
                            Deactivate
                          </Button>
                          <Button
                            variant="secondary"
                            type="button"
                            onClick={() => reactivate.mutate(id)}
                            disabled={reactivate.isPending}
                          >
                            Reactivate
                          </Button>
                        </div>
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
