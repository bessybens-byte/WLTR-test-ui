"use client";

import { ConfirmDialog } from "@/components/modal";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { deleteCalibrationLevel, getCalibrationLevel, updateCalibrationLevel } from "@/lib/api/wltr-api";
import { hasPermission, PERMS } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function CalibrationLevelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useAuth();
  const canEdit = hasPermission(me, PERMS.configEdit);
  const qc = useQueryClient();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const q = useQuery({
    queryKey: ["calibration-level", id],
    queryFn: () => getCalibrationLevel(id),
    enabled: !!id,
  });
  const [form, setForm] = useState({ levelName: "", trueConcentration: 0, sortOrder: 0 });

  useEffect(() => {
    if (!q.data) return;
    const d = q.data as Record<string, unknown>;
    setForm({
      levelName: String(d.levelName ?? ""),
      trueConcentration: Number(d.trueConcentration ?? 0),
      sortOrder: Number(d.sortOrder ?? 0),
    });
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => updateCalibrationLevel(id, form),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["calibration-level", id] });
      toast.success("Calibration level saved");
    },
    onError: (err: unknown) => toast.error("Save failed", err instanceof Error ? err.message : undefined),
  });

  const del = useMutation({
    mutationFn: async () => deleteCalibrationLevel(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["calibration-levels"] });
      toast.success("Calibration level deleted");
      window.location.href = "/calibration-levels";
    },
    onError: (err: unknown) => toast.error("Delete failed", err instanceof Error ? err.message : undefined),
  });

  const title = q.isSuccess && form.levelName.trim() ? form.levelName : "Calibration level";

  return (
    <div>
      <PageHeader
        title={title}
        description={<span className="font-mono text-xs">{id}</span>}
        actions={
          <Link href="/calibration-levels">
            <Button variant="secondary" type="button">
              All levels
            </Button>
          </Link>
        }
      />
      <Card>
        {q.isLoading ? <div className="text-sm">Loading…</div> : null}
        {q.isError ? <div className="text-sm text-red-600">{(q.error as Error).message}</div> : null}
        {q.isSuccess ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (canEdit) save.mutate();
            }}
          >
            <div>
              <Label htmlFor="levelName">Level name</Label>
              <Input
                id="levelName"
                value={form.levelName}
                onChange={(e) => setForm({ ...form, levelName: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="trueConcentration">True concentration</Label>
                <Input
                  id="trueConcentration"
                  type="number"
                  value={form.trueConcentration}
                  onChange={(e) => setForm({ ...form, trueConcentration: Number(e.target.value) })}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label htmlFor="sortOrder">Sort order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  disabled={!canEdit}
                />
              </div>
            </div>
            {save.isError ? <div className="text-sm text-red-600">{(save.error as Error).message}</div> : null}
            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={save.isPending}>
                  Save
                </Button>
                <Button type="button" variant="danger" disabled={del.isPending} onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              </div>
            ) : (
              <ViewOnlyNotice />
            )}
          </form>
        ) : null}
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          del.mutate();
        }}
        title="Delete this calibration level?"
        message="Runs mapped to this level will need remapping. This cannot be undone."
        confirmLabel="Delete"
        danger
        busy={del.isPending}
      />
    </div>
  );
}
