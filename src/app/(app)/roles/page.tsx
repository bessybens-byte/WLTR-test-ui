"use client";

import { Button, Card, EmptyState, Input, Label, PageHeader } from "@/components/ui";
import { PaginationBar } from "@/components/pagination";
import { assignRoles, createRole, listRoles, removeRoles } from "@/lib/api/wltr-api";
import { ALL_PERMISSIONS } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function RolesPage() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [lab, setLab] = useState(me?.laboratoryId ?? "");
  const pageSize = 25;
  const platform = !me?.laboratoryId;

  const q = useQuery({
    queryKey: ["roles", page, lab],
    queryFn: () =>
      listRoles({
        page,
        pageSize,
        sort: "name:asc",
        laboratoryId: lab || undefined,
      }),
  });

  const [name, setName] = useState("");
  const [perms, setPerms] = useState<string[]>(["perm.view"]);

  const create = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { name, permissions: perms };
      if (platform) body.laboratoryId = lab || undefined;
      await createRole(body);
    },
    onSuccess: async () => {
      setName("");
      await qc.invalidateQueries({ queryKey: ["roles"] });
    },
  });

  const [assignUserId, setAssignUserId] = useState("");
  const [assignRoleIds, setAssignRoleIds] = useState("");

  const assign = useMutation({
    mutationFn: async () => {
      const roleIds = assignRoleIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const body: Record<string, unknown> = { userId: assignUserId, roleIds };
      if (platform) body.laboratoryId = lab || undefined;
      await assignRoles(body);
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      const roleIds = assignRoleIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const body: Record<string, unknown> = { userId: assignUserId, roleIds };
      if (platform) body.laboratoryId = lab || undefined;
      await removeRoles(body);
    },
  });

  const togglePerm = (p: string) => {
    setPerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const roleRows = useMemo(() => q.data?.items ?? [], [q.data]);

  return (
    <div className="space-y-6">
      <PageHeader title="Roles" description="Custom roles and assignments (scoped to your laboratory)." />
      {platform ? (
        <Card>
          <Label htmlFor="lab">Laboratory id (platform)</Label>
          <Input id="lab" value={lab} onChange={(e) => setLab(e.target.value)} placeholder="uuid" />
        </Card>
      ) : null}

      <Card>
        <div className="text-sm font-medium">Create custom role</div>
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <div className="text-sm text-neutral-600 dark:text-neutral-400">Permissions</div>
            <div className="grid gap-2 md:grid-cols-2">
              {ALL_PERMISSIONS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={perms.includes(p)} onChange={() => togglePerm(p)} />
                  {p}
                </label>
              ))}
            </div>
          </div>
          {create.isError ? <div className="text-sm text-red-600">{(create.error as Error).message}</div> : null}
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create role"}
          </Button>
        </form>
      </Card>

      <Card>
        <div className="text-sm font-medium">Assign / remove roles</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="userId">User id</Label>
            <Input id="userId" value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="roleIds">Role ids (comma-separated)</Label>
            <Input id="roleIds" value={assignRoleIds} onChange={(e) => setAssignRoleIds(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" type="button" disabled={assign.isPending} onClick={() => assign.mutate()}>
            Assign
          </Button>
          <Button variant="secondary" type="button" disabled={remove.isPending} onClick={() => remove.mutate()}>
            Remove
          </Button>
        </div>
        {(assign.isError || remove.isError) ? (
          <div className="mt-2 text-sm text-red-600">
            {String((assign.error || remove.error) as Error)}
          </div>
        ) : null}
      </Card>

      <Card>
        {q.isLoading ? <div className="text-sm">Loading…</div> : null}
        {q.isError ? <div className="text-sm text-red-600">{(q.error as Error).message}</div> : null}
        {q.isSuccess && (!roleRows || roleRows.length === 0) ? <EmptyState title="No roles" /> : null}
        {q.isSuccess && roleRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Built-in</th>
                  <th className="py-2 pr-3" />
                </tr>
              </thead>
              <tbody>
                {roleRows.map((row) => {
                  const r = row as Record<string, unknown>;
                  const roleId = String(r.roleId ?? "");
                  const builtIn = Boolean(r.isBuiltIn);
                  return (
                    <tr key={roleId} className="border-b border-neutral-100 dark:border-neutral-900">
                      <td className="py-2 pr-3">{String(r.name ?? "")}</td>
                      <td className="py-2 pr-3">{String(builtIn)}</td>
                      <td className="py-2 pr-3 text-right">
                        <Link className="underline" href={`/roles/${encodeURIComponent(roleId)}`}>
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-4">
              <PaginationBar page={page} pageSize={pageSize} totalCount={q.data!.totalCount} onPageChange={setPage} />
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
