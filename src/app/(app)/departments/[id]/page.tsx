"use client";

import { ConfirmDialog } from "@/components/modal";
import { Badge, Button, Card, Input, Label, PageHeader, Textarea } from "@/components/ui";
import {
  deleteDepartment,
  getDepartment,
  setDepartmentActive,
  updateDepartment,
} from "@/lib/api/wltr-api";
import { PERMS, hasPermission } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function s(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const canManage = hasPermission(me, PERMS.departmentsManage);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const q = useQuery({
    queryKey: ["department", id],
    queryFn: () => getDepartment(id),
    enabled: !!id,
  });

  const [form, setForm] = useState({
    name: "",
    description: "",
    isActive: true,
    rowVersion: "",
  });

  useEffect(() => {
    if (!q.data) return;
    const d = q.data as Record<string, unknown>;
    setForm({
      name: s(d.name),
      description: s(d.description),
      isActive: Boolean(d.isActive ?? true),
      rowVersion: s(d.rowVersion),
    });
  }, [q.data]);

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["department", id] });
    await qc.invalidateQueries({ queryKey: ["departments"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      await updateDepartment(id, {
        name: form.name.trim(),
        description: form.description.trim() ? form.description.trim() : null,
        rowVersion: form.rowVersion,
      });
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Department saved");
    },
    onError: (err: unknown) => toast.error("Save failed", err instanceof Error ? err.message : undefined),
  });

  const setActive = useMutation({
    mutationFn: async (isActive: boolean) => {
      await setDepartmentActive(id, { isActive, rowVersion: form.rowVersion });
    },
    onSuccess: async (_data, isActive) => {
      await invalidate();
      toast.success(isActive ? "Department reactivated" : "Department deactivated");
    },
    onError: (err: unknown) =>
      toast.error("Could not update status", err instanceof Error ? err.message : undefined),
  });

  const del = useMutation({
    mutationFn: async () => deleteDepartment(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Department deleted");
      router.replace("/departments");
    },
    onError: (err: unknown) =>
      toast.error(
        "Delete failed",
        err instanceof Error
          ? err.message
          : "Still referenced (including soft-deleted instruments/configs) or last active department.",
      ),
  });

  const title = form.name.trim() || "Department";

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={<span className="font-mono text-xs">{id}</span>}
        actions={
          <Link href="/departments">
            <Button variant="secondary" type="button">
              All departments
            </Button>
          </Link>
        }
      />

      <Card>
        {q.isLoading ? <div className="text-sm">Loading…</div> : null}
        {q.isError ? (
          <div className="text-sm text-red-600">
            {(q.error as Error).message}
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              A 404 means this department is not visible to you (or does not exist) — not that it was deleted.
            </p>
          </div>
        ) : null}

        {q.isSuccess ? (
          <>
            <dl className="mb-6 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-neutral-600 dark:text-neutral-400">Status</dt>
                <dd className="mt-1">
                  <Badge tone={form.isActive ? "ok" : "neutral"}>
                    {form.isActive ? "Active" : "Inactive"}
                  </Badge>
                </dd>
              </div>
              {typeof (q.data as Record<string, unknown>).laboratoryId === "string" ? (
                <div>
                  <dt className="text-neutral-600 dark:text-neutral-400">Laboratory</dt>
                  <dd className="mt-1 font-mono text-xs">
                    {String((q.data as Record<string, unknown>).laboratoryId)}
                  </dd>
                </div>
              ) : null}
            </dl>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (canManage) save.mutate();
              }}
            >
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  disabled={!canManage}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  maxLength={256}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  className="min-h-[80px] font-sans"
                  value={form.description}
                  disabled={!canManage}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={2000}
                />
                <p className="mt-1 text-xs text-neutral-500">Cleared when saved empty.</p>
              </div>

              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={save.isPending || !form.name.trim()}>
                    {save.isPending ? "Saving…" : "Save changes"}
                  </Button>
                  {form.isActive ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={setActive.isPending}
                      onClick={() => setConfirmDeactivate(true)}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={setActive.isPending}
                      onClick={() => setActive.mutate(true)}
                    >
                      Reactivate
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="danger"
                    disabled={del.isPending}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Read-only (missing perm.departments.manage).
                </p>
              )}
            </form>
          </>
        ) : null}
      </Card>

      {canManage ? (
        <Card>
          <div className="text-sm font-medium">Retire vs delete</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600 dark:text-neutral-400">
            <li>
              <strong>Deactivate</strong> retires a real bench. History stays readable; new work stops.
            </li>
            <li>
              <strong>Delete</strong> undoes a mistaken create that never took on work. Soft-deleted
              references still block delete (409).
            </li>
          </ul>
        </Card>
      ) : null}

      <ConfirmDialog
        open={confirmDeactivate}
        onCancel={() => setConfirmDeactivate(false)}
        onConfirm={() => {
          setConfirmDeactivate(false);
          setActive.mutate(false);
        }}
        title="Deactivate this department?"
        message="It will stop accepting new work. Calibration history stays attributed here. Prefer this over delete when retiring a bench."
        confirmLabel="Deactivate"
        busy={setActive.isPending}
      />

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          del.mutate();
        }}
        title="Delete this department?"
        message="Only for undoing a mistake. Fails if anything is filed under it (including soft-deleted instruments/configs) or if it is the last active department."
        confirmLabel="Delete department"
        danger
        busy={del.isPending}
      />
    </div>
  );
}
