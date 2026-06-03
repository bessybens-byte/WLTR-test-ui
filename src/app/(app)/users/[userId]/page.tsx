"use client";

import { Badge, Button, Card, Input, Label, PageHeader } from "@/components/ui";
import {
  assignRoles,
  deactivateUser,
  getUser,
  listRoles,
  reactivateUser,
  removeRoles,
} from "@/lib/api/wltr-api";
import { hasPermission, PERMS } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

type AssignedRole = {
  roleId: string;
  name: string;
  isBuiltIn: boolean;
};

function parseRoles(raw: unknown): AssignedRole[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (typeof row !== "object" || row === null) return null;
      const r = row as Record<string, unknown>;
      const roleId = typeof r.roleId === "string" ? r.roleId : "";
      if (!roleId) return null;
      return {
        roleId,
        name: typeof r.name === "string" ? r.name : roleId,
        isBuiltIn: Boolean(r.isBuiltIn),
      };
    })
    .filter((r): r is AssignedRole => r !== null);
}

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const decodedUserId = decodeURIComponent(userId);
  const { me } = useAuth();
  const qc = useQueryClient();
  const platform = !me?.laboratoryId;
  const canManageRoles = hasPermission(me, PERMS.rolesManageLab);
  const [lab, setLab] = useState(me?.laboratoryId ?? "");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  const labParam = platform && lab.trim() ? lab.trim() : undefined;

  const userQuery = useQuery({
    queryKey: ["user", decodedUserId, labParam],
    queryFn: () => getUser(decodedUserId, labParam ? { laboratoryId: labParam } : undefined),
  });

  const rolesCatalogQuery = useQuery({
    queryKey: ["roles", "catalog", labParam ?? me?.laboratoryId],
    queryFn: () =>
      listRoles({
        page: 1,
        pageSize: 100,
        sort: "name:asc",
        laboratoryId: labParam,
      }),
    enabled: canManageRoles,
  });

  const user = userQuery.data as Record<string, unknown> | undefined;
  const assignedRoles = useMemo(() => parseRoles(user?.roles), [user?.roles]);
  const assignedRoleIds = useMemo(() => new Set(assignedRoles.map((r) => r.roleId)), [assignedRoles]);

  const catalogRoles = useMemo(() => {
    const items = rolesCatalogQuery.data?.items ?? [];
    return items
      .map((row) => {
        const r = row as Record<string, unknown>;
        const roleId = typeof r.roleId === "string" ? r.roleId : "";
        if (!roleId) return null;
        return {
          roleId,
          name: typeof r.name === "string" ? r.name : roleId,
          isBuiltIn: Boolean(r.isBuiltIn),
        };
      })
      .filter((r): r is AssignedRole => r !== null);
  }, [rolesCatalogQuery.data]);

  const rolesToAssign = selectedRoleIds.filter((id) => !assignedRoleIds.has(id));
  const rolesToRemove = selectedRoleIds.filter((id) => assignedRoleIds.has(id));

  const invalidateUser = async () => {
    await qc.invalidateQueries({ queryKey: ["user", decodedUserId] });
    await qc.invalidateQueries({ queryKey: ["users"] });
  };

  const assign = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { userId: decodedUserId, roleIds: rolesToAssign };
      if (platform) body.laboratoryId = labParam;
      await assignRoles(body);
    },
    onSuccess: async () => {
      setSelectedRoleIds([]);
      await invalidateUser();
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { userId: decodedUserId, roleIds: rolesToRemove };
      if (platform) body.laboratoryId = labParam;
      await removeRoles(body);
    },
    onSuccess: async () => {
      setSelectedRoleIds([]);
      await invalidateUser();
    },
  });

  const deactivate = useMutation({
    mutationFn: async () => deactivateUser(decodedUserId, labParam),
    onSuccess: invalidateUser,
  });

  const reactivate = useMutation({
    mutationFn: async () => reactivateUser(decodedUserId, labParam),
    onSuccess: invalidateUser,
  });

  const toggleRoleSelection = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    );
  };

  const displayEmail = typeof user?.email === "string" ? user.email : decodedUserId;
  const isActive = user?.isActive !== false;

  return (
    <div className="space-y-6">
      <PageHeader
        title={userQuery.isSuccess ? displayEmail : "User"}
        description={<span className="font-mono text-xs">{decodedUserId}</span>}
        actions={
          <Link href="/users">
            <Button variant="secondary" type="button">
              All users
            </Button>
          </Link>
        }
      />

      {platform ? (
        <Card>
          <Label htmlFor="lab">Laboratory id (platform)</Label>
          <Input id="lab" value={lab} onChange={(e) => setLab(e.target.value)} placeholder="uuid" className="mt-1" />
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            Required when loading or managing users as a platform operator.
          </p>
        </Card>
      ) : null}

      <Card>
        {userQuery.isLoading ? <div className="text-sm text-neutral-500">Loading user…</div> : null}
        {userQuery.isError ? <div className="text-sm text-red-600">{(userQuery.error as Error).message}</div> : null}

        {userQuery.isSuccess && user ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-neutral-600 dark:text-neutral-400">Name</dt>
              <dd className="mt-1 font-medium">
                {[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-600 dark:text-neutral-400">Status</dt>
              <dd className="mt-1">
                <Badge tone={isActive ? "ok" : "bad"}>{isActive ? "Active" : "Deactivated"}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-neutral-600 dark:text-neutral-400">Laboratory</dt>
              <dd className="mt-1">
                {typeof user.laboratoryName === "string" && user.laboratoryName ? user.laboratoryName : "—"}
                {typeof user.laboratoryId === "string" ? (
                  <div className="font-mono text-xs text-neutral-500">{user.laboratoryId}</div>
                ) : null}
              </dd>
            </div>
            {typeof user.qualifications === "string" && user.qualifications ? (
              <div>
                <dt className="text-neutral-600 dark:text-neutral-400">Qualifications</dt>
                <dd className="mt-1">{user.qualifications}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </Card>

      <Card>
        <div className="text-sm font-medium">Assigned roles</div>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Roles determine what this user can see and do. Changes take effect on the user&apos;s next sign-in or token
          refresh.
        </p>

        {userQuery.isSuccess ? (
          assignedRoles.length ? (
            <ul className="mt-4 space-y-2">
              {assignedRoles.map((role) => (
                <li
                  key={role.roleId}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800"
                >
                  <div>
                    <span className="font-medium">{role.name}</span>
                    {role.isBuiltIn ? (
                      <Badge tone="neutral" className="ml-2">
                        Built-in
                      </Badge>
                    ) : (
                      <Badge tone="neutral" className="ml-2">
                        Custom
                      </Badge>
                    )}
                  </div>
                  <span className="font-mono text-xs text-neutral-500">{role.roleId}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-neutral-500">No roles assigned.</p>
          )
        ) : null}
      </Card>

      {canManageRoles ? (
        <Card>
          <div className="text-sm font-medium">Manage role assignments</div>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            Select roles below, then assign new ones or remove existing assignments.
          </p>

          {rolesCatalogQuery.isLoading ? (
            <div className="mt-3 text-sm text-neutral-500">Loading available roles…</div>
          ) : null}
          {rolesCatalogQuery.isError ? (
            <div className="mt-3 text-sm text-red-600">{(rolesCatalogQuery.error as Error).message}</div>
          ) : null}

          {catalogRoles.length ? (
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {catalogRoles.map((role) => {
                const checked = selectedRoleIds.includes(role.roleId);
                const isAssigned = assignedRoleIds.has(role.roleId);
                return (
                  <label
                    key={role.roleId}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                      isAssigned
                        ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
                        : "border-neutral-200 dark:border-neutral-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked}
                      onChange={() => toggleRoleSelection(role.roleId)}
                    />
                    <span>
                      <span className="font-medium">{role.name}</span>
                      {isAssigned ? (
                        <span className="ml-1 text-xs text-emerald-700 dark:text-emerald-300">(assigned)</span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : rolesCatalogQuery.isSuccess ? (
            <p className="mt-3 text-sm text-neutral-500">No roles available in this laboratory.</p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={assign.isPending || rolesToAssign.length === 0}
              onClick={() => assign.mutate()}
            >
              {assign.isPending ? "Assigning…" : `Assign selected (${rolesToAssign.length})`}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={remove.isPending || rolesToRemove.length === 0}
              onClick={() => remove.mutate()}
            >
              {remove.isPending ? "Removing…" : `Remove selected (${rolesToRemove.length})`}
            </Button>
          </div>
          {(assign.isError || remove.isError) && (
            <div className="mt-2 text-sm text-red-600">
              {((assign.error ?? remove.error) as Error).message}
            </div>
          )}
        </Card>
      ) : null}

      <Card>
        <div className="text-sm font-medium">Account access</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={deactivate.isPending || !isActive}
            onClick={() => deactivate.mutate()}
          >
            Deactivate
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={reactivate.isPending || isActive}
            onClick={() => reactivate.mutate()}
          >
            Reactivate
          </Button>
        </div>
        {(deactivate.isError || reactivate.isError) && (
          <div className="mt-2 text-sm text-red-600">
            {((deactivate.error ?? reactivate.error) as Error).message}
          </div>
        )}
      </Card>
    </div>
  );
}
