"use client";

import { ConfirmDialog } from "@/components/modal";
import { PaginationBar } from "@/components/pagination";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { Badge, Button, Card, EmptyState, Input, Label, PageHeader } from "@/components/ui";
import {
  deleteCalibrationLevelSet,
  getCalibrationLevelSet,
  listCalibrationLevels,
  setCalibrationLevelSetActive,
  updateCalibrationLevelSet,
} from "@/lib/api/wltr-api";
import { hasPermission, PERMS } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function s(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export default function CalibrationLevelSetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const canEdit = hasPermission(me, PERMS.configEdit);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [levelPage, setLevelPage] = useState(1);
  const levelPageSize = 25;

  const q = useQuery({
    queryKey: ["calibration-level-set", id],
    queryFn: () => getCalibrationLevelSet(id),
    enabled: !!id,
  });

  const levelsQuery = useQuery({
    queryKey: ["calibration-level-set-levels", id, levelPage],
    queryFn: () => listCalibrationLevels(id, { page: levelPage, pageSize: levelPageSize, sort: "sortOrder:asc" }),
    enabled: !!id,
  });

  const [form, setForm] = useState({
    name: "",
    isActive: true,
    rowVersion: "",
  });

  useEffect(() => {
    if (!q.data) return;
    const d = q.data as Record<string, unknown>;
    setForm({
      name: s(d.name),
      isActive: Boolean(d.isActive ?? true),
      rowVersion: s(d.rowVersion),
    });
  }, [q.data]);

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["calibration-level-set", id] });
    await qc.invalidateQueries({ queryKey: ["calibration-level-sets"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      await updateCalibrationLevelSet(id, {
        name: form.name.trim(),
        rowVersion: form.rowVersion,
      });
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Calibration level set saved");
    },
    onError: (err: unknown) => toast.error("Save failed", err instanceof Error ? err.message : undefined),
  });

  const setActive = useMutation({
    mutationFn: async (isActive: boolean) => {
      await setCalibrationLevelSetActive(id, { isActive, rowVersion: form.rowVersion });
    },
    onSuccess: async (_data, isActive) => {
      await invalidate();
      toast.success(isActive ? "Level set reactivated" : "Level set retired");
    },
    onError: (err: unknown) =>
      toast.error("Could not update status", err instanceof Error ? err.message : undefined),
  });

  const del = useMutation({
    mutationFn: async () => deleteCalibrationLevelSet(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["calibration-level-sets"] });
      toast.success("Calibration level set deleted");
      router.replace("/calibration-level-sets");
    },
    onError: (err: unknown) =>
      toast.error(
        "Delete failed",
        err instanceof Error
          ? err.message
          : "Still referenced by a method config or run, or its levels were computed against.",
      ),
  });

  const title = form.name.trim() || "Calibration level set";

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={<span className="font-mono text-xs">{id}</span>}
        actions={
          <Link href="/calibration-level-sets">
            <Button variant="secondary" type="button">
              All level sets
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
              A 404 means this set is not visible to you (or does not exist) — not that it was deleted.
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
                    {form.isActive ? "Active" : "Retired"}
                  </Badge>
                </dd>
              </div>
              {typeof (q.data as Record<string, unknown>).departmentId === "string" ? (
                <div>
                  <dt className="text-neutral-600 dark:text-neutral-400">Department</dt>
                  <dd className="mt-1">
                    {s((q.data as Record<string, unknown>).departmentName) ||
                      String((q.data as Record<string, unknown>).departmentId)}
                  </dd>
                </div>
              ) : null}
            </dl>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (canEdit) save.mutate();
              }}
            >
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  maxLength={256}
                />
              </div>

              {canEdit ? (
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
                      Retire
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
                  <Button type="button" variant="danger" disabled={del.isPending} onClick={() => setConfirmDelete(true)}>
                    Delete
                  </Button>
                </div>
              ) : (
                <ViewOnlyNotice />
              )}
            </form>
          </>
        ) : null}
      </Card>

      {canEdit ? (
        <Card>
          <div className="text-sm font-medium">Retire vs delete</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600 dark:text-neutral-400">
            <li>
              <strong>Retire</strong> drops the ladder from method-config and run pickers; history stays
              readable and attributed.
            </li>
            <li>
              <strong>Delete</strong> undoes a mistaken create that never took on work. Fails (409) when a
              method config, run, or computed point references it.
            </li>
          </ul>
        </Card>
      ) : null}

      <Card>
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium">Levels</div>
          {canEdit ? (
            <Link href={`/calibration-level-sets/${id}/levels/new`}>
              <Button type="button" variant="secondary">
                New level
              </Button>
            </Link>
          ) : null}
        </div>
        {levelsQuery.isLoading ? <div className="mt-2 text-sm">Loading levels…</div> : null}
        {levelsQuery.isError ? (
          <div className="mt-2 text-sm text-red-600">{(levelsQuery.error as Error).message}</div>
        ) : null}
        {levelsQuery.isSuccess && (!levelsQuery.data.items || levelsQuery.data.items.length === 0) ? (
          <EmptyState title="No levels" hint="Add levels to define this ladder of standards." />
        ) : null}
        {levelsQuery.isSuccess && levelsQuery.data.items && levelsQuery.data.items.length > 0 ? (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">True conc.</th>
                  <th className="py-2 pr-3">Sort</th>
                  <th className="py-2 pr-3" />
                </tr>
              </thead>
              <tbody>
                {levelsQuery.data.items!.map((row) => {
                  const r = row as Record<string, unknown>;
                  const levelId = String(r.id ?? "");
                  return (
                    <tr key={levelId} className="border-b border-neutral-100 dark:border-neutral-900">
                      <td className="py-2 pr-3">{String(r.levelName ?? "")}</td>
                      <td className="py-2 pr-3">{String(r.trueConcentration ?? "")}</td>
                      <td className="py-2 pr-3">{String(r.sortOrder ?? "")}</td>
                      <td className="py-2 pr-3 text-right">
                        <Link className="underline" href={`/calibration-level-sets/${id}/levels/${levelId}`}>
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-4">
              <PaginationBar
                page={levelPage}
                pageSize={levelPageSize}
                totalCount={levelsQuery.data.totalCount}
                onPageChange={setLevelPage}
              />
            </div>
          </div>
        ) : null}
      </Card>

      <ConfirmDialog
        open={confirmDeactivate}
        onCancel={() => setConfirmDeactivate(false)}
        onConfirm={() => {
          setConfirmDeactivate(false);
          setActive.mutate(false);
        }}
        title="Retire this calibration level set?"
        message="It will stop accepting new runs and levels. Calibration history stays attributed here. Prefer this over delete when retiring a ladder."
        confirmLabel="Retire"
        busy={setActive.isPending}
      />

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          del.mutate();
        }}
        title="Delete this calibration level set?"
        message="Only for undoing a mistake. Fails if a method config, run, or computed point references the set or its levels."
        confirmLabel="Delete level set"
        danger
        busy={del.isPending}
      />
    </div>
  );
}
