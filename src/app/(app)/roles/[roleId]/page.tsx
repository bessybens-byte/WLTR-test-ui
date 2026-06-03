"use client";

import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { deleteRole, findRoleById, renameRole, updateRolePermissions } from "@/lib/api/wltr-api";
import { ALL_PERMISSIONS } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function RoleDetailPage() {
  const { roleId } = useParams<{ roleId: string }>();
  const { me } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const platform = !me?.laboratoryId;
  const [lab, setLab] = useState(me?.laboratoryId ?? "");
  const [newName, setNewName] = useState("");
  const [perms, setPerms] = useState<string[]>(["perm.view"]);

  const decodedRoleId = useMemo(() => decodeURIComponent(roleId), [roleId]);

  const roleQuery = useQuery({
    queryKey: ["roles", "detail", decodedRoleId, platform ? lab : me?.laboratoryId],
    queryFn: () =>
      findRoleById(decodedRoleId, {
        laboratoryId: platform && lab.trim() ? lab.trim() : undefined,
      }),
    enabled: Boolean(decodedRoleId) && (!platform || Boolean(lab.trim())),
  });

  const role = roleQuery.data ?? null;

  useEffect(() => {
    if (!role) return;
    if (typeof role.name === "string") setNewName(role.name);
    if (Array.isArray(role.permissions)) setPerms(role.permissions as string[]);
  }, [role]);

  const rename = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { name: newName };
      if (platform) body.laboratoryId = lab || undefined;
      await renameRole(roleId, body);
    },
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });

  const savePerms = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { permissions: perms };
      if (platform) body.laboratoryId = lab || undefined;
      await updateRolePermissions(roleId, body);
    },
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });

  const del = useMutation({
    mutationFn: async () => {
      await deleteRole(roleId, platform ? lab || undefined : undefined);
    },
    onSuccess: async () => router.replace("/roles"),
  });

  const togglePerm = (p: string) => {
    setPerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={typeof role?.name === "string" ? role.name : "Role"}
        description={decodedRoleId}
      />

      {roleQuery.isLoading ? <div className="text-sm text-neutral-500">Loading role…</div> : null}
      {roleQuery.isSuccess && !role ? (
        <div className="text-sm text-red-600">Role not found in this laboratory.</div>
      ) : null}
      {role?.isBuiltIn ? (
        <Card>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Built-in roles cannot be renamed or deleted. Permission changes apply only to custom roles.
          </p>
        </Card>
      ) : null}

      {platform ? (
        <Card>
          <Label htmlFor="lab">Laboratory id (platform)</Label>
          <Input id="lab" value={lab} onChange={(e) => setLab(e.target.value)} />
        </Card>
      ) : null}

      <Card>
        <div className="text-sm font-medium">Rename</div>
        <form
          className="mt-3 flex flex-col gap-3 md:flex-row md:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            rename.mutate();
          }}
        >
          <div className="min-w-[240px] flex-1">
            <Label htmlFor="newName">Display name</Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              disabled={Boolean(role?.isBuiltIn)}
            />
          </div>
          <Button type="submit" disabled={rename.isPending || Boolean(role?.isBuiltIn)}>
            Rename
          </Button>
        </form>
        {rename.isError ? <div className="mt-2 text-sm text-red-600">{(rename.error as Error).message}</div> : null}
      </Card>

      <Card>
        <div className="text-sm font-medium">Permissions</div>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Changes take effect the next time the user signs in or refreshes their session.
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {ALL_PERMISSIONS.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={perms.includes(p)}
                onChange={() => togglePerm(p)}
                disabled={Boolean(role?.isBuiltIn)}
              />
              {p}
            </label>
          ))}
        </div>
        <div className="mt-3">
          <Button
            type="button"
            variant="secondary"
            disabled={savePerms.isPending || Boolean(role?.isBuiltIn)}
            onClick={() => savePerms.mutate()}
          >
            Save permissions
          </Button>
        </div>
        {savePerms.isError ? <div className="mt-2 text-sm text-red-600">{(savePerms.error as Error).message}</div> : null}
      </Card>

      {!role?.isBuiltIn ? (
        <Card>
          <div className="text-sm font-medium text-red-700">Delete custom role</div>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            Only roles with no assigned users can be deleted.
          </p>
          <div className="mt-3">
            <Button variant="danger" type="button" disabled={del.isPending} onClick={() => del.mutate()}>
              Delete role
            </Button>
          </div>
          {del.isError ? <div className="mt-2 text-sm text-red-600">{(del.error as Error).message}</div> : null}
        </Card>
      ) : null}
    </div>
  );
}
