"use client";

import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { deleteRole, renameRole, updateRolePermissions } from "@/lib/api/wltr-api";
import { useAuth } from "@/providers/auth-provider";
import { useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const ALL_PERMS = [
  "perm.view",
  "perm.runs.upload",
  "perm.runs.delete",
  "perm.groups.approve",
  "perm.config.edit",
  "perm.users.manage_lab",
  "perm.roles.manage_lab",
  "perm.laboratories.manage",
  "perm.laboratories.create",
  "perm.platform.manage",
];

export default function RoleDetailPage() {
  const { roleId } = useParams<{ roleId: string }>();
  const { me } = useAuth();
  const router = useRouter();
  const platform = !me?.laboratoryId;
  const [lab, setLab] = useState(me?.laboratoryId ?? "");
  const [newName, setNewName] = useState("");
  const [perms, setPerms] = useState<string[]>(["perm.view"]);

  const rename = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { name: newName };
      if (platform) body.laboratoryId = lab || undefined;
      await renameRole(roleId, body);
    },
  });

  const savePerms = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { permissions: perms };
      if (platform) body.laboratoryId = lab || undefined;
      await updateRolePermissions(roleId, body);
    },
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

  const decodedRoleId = useMemo(() => decodeURIComponent(roleId), [roleId]);

  return (
    <div className="space-y-6">
      <PageHeader title="Role" description={decodedRoleId} />
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
            <Label htmlFor="newName">New display name</Label>
            <Input id="newName" value={newName} onChange={(e) => setNewName(e.target.value)} required />
          </div>
          <Button type="submit" disabled={rename.isPending}>
            Rename
          </Button>
        </form>
        {rename.isError ? <div className="mt-2 text-sm text-red-600">{(rename.error as Error).message}</div> : null}
      </Card>

      <Card>
        <div className="text-sm font-medium">Replace permissions</div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {ALL_PERMS.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={perms.includes(p)} onChange={() => togglePerm(p)} />
              {p}
            </label>
          ))}
        </div>
        <div className="mt-3">
          <Button type="button" variant="secondary" disabled={savePerms.isPending} onClick={() => savePerms.mutate()}>
            Save permissions
          </Button>
        </div>
        {savePerms.isError ? <div className="mt-2 text-sm text-red-600">{(savePerms.error as Error).message}</div> : null}
      </Card>

      <Card>
        <div className="text-sm font-medium text-red-700">Danger zone</div>
        <div className="mt-3">
          <Button variant="danger" type="button" disabled={del.isPending} onClick={() => del.mutate()}>
            Delete custom role
          </Button>
        </div>
        {del.isError ? <div className="mt-2 text-sm text-red-600">{(del.error as Error).message}</div> : null}
      </Card>
    </div>
  );
}
