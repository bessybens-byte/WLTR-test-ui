"use client";

import { ConfirmDialog } from "@/components/modal";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { ExcelAnnotation } from "@/components/excel-annotation";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { deleteCalibrationLevel, getCalibrationLevel, updateCalibrationLevel } from "@/lib/api/wltr-api";
import { hasPermission, PERMS } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

function s(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export default function CalibrationLevelDetailPage() {
  const { id: setId, levelId } = useParams<{ id: string; levelId: string }>();
  const { me } = useAuth();
  const canEdit = hasPermission(me, PERMS.configEdit);
  const qc = useQueryClient();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const q = useQuery({
    queryKey: ["calibration-level", setId, levelId],
    queryFn: () => getCalibrationLevel(setId, levelId),
    enabled: !!setId && !!levelId,
  });
  const [form, setForm] = useState({
    levelName: "",
    trueConcentration: 0,
    sortOrder: 0,
    rowVersion: "",
  });

  useEffect(() => {
    if (!q.data) return;
    const d = q.data as Record<string, unknown>;
    setForm({
      levelName: s(d.levelName),
      trueConcentration: Number(d.trueConcentration ?? 0),
      sortOrder: Number(d.sortOrder ?? 0),
      rowVersion: s(d.rowVersion),
    });
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => updateCalibrationLevel(setId, levelId, form),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["calibration-level", setId, levelId] });
      toast.success("Calibration level saved");
    },
    onError: (err: unknown) => toast.error("Save failed", err instanceof Error ? err.message : undefined),
  });

  const del = useMutation({
    mutationFn: async () => deleteCalibrationLevel(setId, levelId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["calibration-level-set-levels", setId] });
      toast.success("Calibration level deleted");
      window.location.href = `/calibration-level-sets/${setId}`;
    },
    onError: (err: unknown) => toast.error("Delete failed", err instanceof Error ? err.message : undefined),
  });

  const title = q.isSuccess && form.levelName.trim() ? form.levelName : "Calibration level";

  return (
    <div>
      <PageHeader
        title={title}
        description={<span className="font-mono text-xs">{levelId}</span>}
        actions={
          <Link href={`/calibration-level-sets/${setId}`}>
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
              <ExcelAnnotation fieldKey="calLevel.levelName" />
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
                <ExcelAnnotation fieldKey="calLevel.trueConcentration" />
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
                <ExcelAnnotation fieldKey="calLevel.sortOrder" />
                <Input
                  id="sortOrder"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  disabled={!canEdit}
                />
              </div>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Edits apply to future computations only — historical approved curves are never rewritten.
            </p>
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
        message="Fails if any run or computed point references it. Prefer retiring the whole set instead."
        confirmLabel="Delete"
        danger
        busy={del.isPending}
      />
    </div>
  );
}
