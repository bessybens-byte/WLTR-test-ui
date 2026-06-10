"use client";

import { ViewOnlyNotice } from "@/components/view-only-notice";
import { Button, Card, Input, Label, PageHeader, Select } from "@/components/ui";
import { deleteMethodConfig, getMethodConfig, updateMethodConfig } from "@/lib/api/wltr-api";
import { hasPermission, PERMS, QUANTITATION_MODE_LABEL } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function MethodConfigDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useAuth();
  const canEdit = hasPermission(me, PERMS.configEdit);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["method-config", id],
    queryFn: () => getMethodConfig(id),
    enabled: !!id,
  });
  const [form, setForm] = useState({
    name: "",
    labelMode: 0,
    quantitationMode: 0,
    minCorrelation: 0,
    maxRSE: 0,
    pctDiffLowBound: 0,
    pctDiffHighBound: 0,
    minPointsRequired: 0,
    maxMissedPoints: 0,
    icvLimitPercent: 0,
    internalStandardResponseMin: "",
    internalStandardResponseMax: "",
  });
  const [versionNote, setVersionNote] = useState<string | null>(null);

  useEffect(() => {
    if (!q.data) return;
    const d = q.data as Record<string, unknown>;
    setForm({
      name: String(d.name ?? ""),
      labelMode: Number(d.labelMode ?? 0),
      quantitationMode: Number(d.quantitationMode ?? 0),
      minCorrelation: Number(d.minCorrelation ?? 0),
      maxRSE: Number(d.maxRSE ?? 0),
      pctDiffLowBound: Number(d.pctDiffLowBound ?? 0),
      pctDiffHighBound: Number(d.pctDiffHighBound ?? 0),
      minPointsRequired: Number(d.minPointsRequired ?? 0),
      maxMissedPoints: Number(d.maxMissedPoints ?? 0),
      icvLimitPercent: Number(d.icvLimitPercent ?? 0),
      internalStandardResponseMin:
        d.internalStandardResponseMin == null ? "" : String(d.internalStandardResponseMin),
      internalStandardResponseMax:
        d.internalStandardResponseMax == null ? "" : String(d.internalStandardResponseMax),
    });
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () =>
      updateMethodConfig(id, {
        ...form,
        internalStandardResponseMin:
          form.internalStandardResponseMin === "" ? null : Number(form.internalStandardResponseMin),
        internalStandardResponseMax:
          form.internalStandardResponseMax === "" ? null : Number(form.internalStandardResponseMax),
      }),
    onSuccess: async (data) => {
      setVersionNote(`currentVersion: ${String((data as { currentVersion?: number }).currentVersion ?? "—")}`);
      await qc.invalidateQueries({ queryKey: ["method-config", id] });
    },
  });

  const del = useMutation({
    mutationFn: async () => deleteMethodConfig(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["method-configs"] });
      window.location.href = "/method-configs";
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Method configuration"
        description={id}
        actions={
          <Link href={`/method-configs/${id}/snapshots`}>
            <Button variant="secondary" type="button">
              Snapshots
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
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!canEdit} />
            </div>
            <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <div className="mb-3 text-sm font-medium">Methodology</div>
              <p className="mb-3 text-xs text-neutral-600 dark:text-neutral-400">
                Regression type and weighting are no longer stored on the method config — every variant is computed on
                each calibration group, then QA selects the best model on the report card.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="lm">Label mode</Label>
                <Select
                  id="lm"
                  value={String(form.labelMode)}
                  onChange={(e) => setForm({ ...form, labelMode: Number(e.target.value) })}
                  disabled={!canEdit}
                >
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="qm">Quantitation mode</Label>
                <Select
                  id="qm"
                  value={String(form.quantitationMode)}
                  onChange={(e) => setForm({ ...form, quantitationMode: Number(e.target.value) })}
                  disabled={!canEdit}
                >
                  {[0, 1].map((v) => (
                    <option key={v} value={v}>
                      {v} — {QUANTITATION_MODE_LABEL[v]}
                    </option>
                  ))}
                </Select>
              </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="minCorrelation">minCorrelation</Label>
                <Input
                  id="minCorrelation"
                  type="number"
                  step="0.0001"
                  value={form.minCorrelation}
                  onChange={(e) => setForm({ ...form, minCorrelation: Number(e.target.value) })}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label htmlFor="maxRSE">maxRSE</Label>
                <Input id="maxRSE" type="number" step="0.0001" value={form.maxRSE} onChange={(e) => setForm({ ...form, maxRSE: Number(e.target.value) })} disabled={!canEdit} />
              </div>
              <div>
                <Label htmlFor="pctDiffLowBound">pctDiffLowBound</Label>
                <Input
                  id="pctDiffLowBound"
                  type="number"
                  step="0.0001"
                  value={form.pctDiffLowBound}
                  onChange={(e) => setForm({ ...form, pctDiffLowBound: Number(e.target.value) })}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label htmlFor="pctDiffHighBound">pctDiffHighBound</Label>
                <Input
                  id="pctDiffHighBound"
                  type="number"
                  step="0.0001"
                  value={form.pctDiffHighBound}
                  onChange={(e) => setForm({ ...form, pctDiffHighBound: Number(e.target.value) })}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label htmlFor="minPointsRequired">minPointsRequired</Label>
                <Input
                  id="minPointsRequired"
                  type="number"
                  value={form.minPointsRequired}
                  onChange={(e) => setForm({ ...form, minPointsRequired: Number(e.target.value) })}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label htmlFor="maxMissedPoints">maxMissedPoints</Label>
                <Input
                  id="maxMissedPoints"
                  type="number"
                  value={form.maxMissedPoints}
                  onChange={(e) => setForm({ ...form, maxMissedPoints: Number(e.target.value) })}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label htmlFor="icvLimitPercent">icvLimitPercent</Label>
                <Input
                  id="icvLimitPercent"
                  type="number"
                  step="0.0001"
                  value={form.icvLimitPercent}
                  onChange={(e) => setForm({ ...form, icvLimitPercent: Number(e.target.value) })}
                  disabled={!canEdit}
                />
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                IS response bounds (optional)
              </div>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                Inclusive thresholds on mean IS response for run/group summary warnings. Clear both to remove bounds.
              </p>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="isMin">internalStandardResponseMin</Label>
                  <Input
                    id="isMin"
                    type="number"
                    step="any"
                    value={form.internalStandardResponseMin}
                    onChange={(e) => setForm({ ...form, internalStandardResponseMin: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="isMax">internalStandardResponseMax</Label>
                  <Input
                    id="isMax"
                    type="number"
                    step="any"
                    value={form.internalStandardResponseMax}
                    onChange={(e) => setForm({ ...form, internalStandardResponseMax: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </div>
            {save.isError ? <div className="text-sm text-red-600">{(save.error as Error).message}</div> : null}
            {versionNote ? <div className="text-sm text-neutral-700 dark:text-neutral-300">{versionNote}</div> : null}
            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={save.isPending}>
                  Save changes
                </Button>
                <Button type="button" variant="danger" disabled={del.isPending} onClick={() => del.mutate()}>
                  Delete
                </Button>
              </div>
            ) : (
              <ViewOnlyNotice />
            )}
          </form>
        ) : null}
      </Card>
    </div>
  );
}
