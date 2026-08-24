"use client";

import { DepartmentPicker } from "@/components/department-picker";
import { MethodConfigAnalyteCriteriaPanel } from "@/components/method-config-analyte-criteria-panel";
import { MethodConfigFormFields, type MethodConfigFormState } from "@/components/method-config-form-fields";
import { ExcelPageGuide } from "@/components/excel-annotation";
import { ConfirmDialog } from "@/components/modal";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { Button, Card, Label, PageHeader } from "@/components/ui";
import {
  deleteMethodConfig,
  getMethodConfig,
  setMethodConfigDepartment,
  updateMethodConfig,
} from "@/lib/api/wltr-api";
import { hasPermission, isPlatformOperator, PERMS } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const defaultForm: MethodConfigFormState = {
  name: "",
  labelMode: "RSquared",
  quantitationMode: "InternalStandard",
  minCorrelation: 0,
  maxRSE: 0,
  pctDiffLowBound: 0,
  pctDiffHighBound: 0,
  minPointsRequired: 0,
  maxMissedPoints: 0,
  icvLimitPercent: 0,
  rsdPercentLimit: 15,
  isRsdPercentLimit: 20,
  icvCdsParityPercent: 0.01,
  soilDilutionFactor: "",
  aqueousDilutionFactor: "",
  internalStandardResponseMin: "",
  internalStandardResponseMax: "",
};

function s(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export default function MethodConfigDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useAuth();
  const canEdit = hasPermission(me, PERMS.configEdit);
  const platform = isPlatformOperator(me);
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({
    queryKey: ["method-config", id],
    queryFn: () => getMethodConfig(id),
    enabled: !!id,
  });
  const [form, setForm] = useState<MethodConfigFormState>(defaultForm);
  const [versionNote, setVersionNote] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [departmentName, setDepartmentName] = useState("");

  useEffect(() => {
    if (!q.data) return;
    const d = q.data as Record<string, unknown>;
    setForm({
      name: String(d.name ?? ""),
      labelMode: typeof d.labelMode === "string" ? d.labelMode : "RSquared",
      quantitationMode: typeof d.quantitationMode === "string" ? d.quantitationMode : "InternalStandard",
      minCorrelation: Number(d.minCorrelation ?? 0),
      maxRSE: Number(d.maxRSE ?? 0),
      pctDiffLowBound: Number(d.pctDiffLowBound ?? 0),
      pctDiffHighBound: Number(d.pctDiffHighBound ?? 0),
      minPointsRequired: Number(d.minPointsRequired ?? 0),
      maxMissedPoints: Number(d.maxMissedPoints ?? 0),
      icvLimitPercent: Number(d.icvLimitPercent ?? 0),
      rsdPercentLimit: Number(d.rsdPercentLimit ?? 15),
      isRsdPercentLimit: Number(d.isRsdPercentLimit ?? 20),
      icvCdsParityPercent: Number(d.icvCdsParityPercent ?? 0.01),
      soilDilutionFactor: d.soilDilutionFactor == null ? "" : String(d.soilDilutionFactor),
      aqueousDilutionFactor: d.aqueousDilutionFactor == null ? "" : String(d.aqueousDilutionFactor),
      internalStandardResponseMin:
        d.internalStandardResponseMin == null ? "" : String(d.internalStandardResponseMin),
      internalStandardResponseMax:
        d.internalStandardResponseMax == null ? "" : String(d.internalStandardResponseMax),
    });
    setDepartmentId(s(d.departmentId));
    setDepartmentName(s(d.departmentName));
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () =>
      updateMethodConfig(id, {
        ...form,
        soilDilutionFactor: form.soilDilutionFactor === "" ? null : Number(form.soilDilutionFactor),
        aqueousDilutionFactor: form.aqueousDilutionFactor === "" ? null : Number(form.aqueousDilutionFactor),
        internalStandardResponseMin:
          form.internalStandardResponseMin === "" ? null : Number(form.internalStandardResponseMin),
        internalStandardResponseMax:
          form.internalStandardResponseMax === "" ? null : Number(form.internalStandardResponseMax),
      }),
    onSuccess: async (data) => {
      const version = String((data as { currentVersion?: number }).currentVersion ?? "—");
      setVersionNote(`Saved — current version ${version}`);
      await qc.invalidateQueries({ queryKey: ["method-config", id] });
      toast.success("Method configuration saved", `Now at version ${version}.`);
    },
    onError: (err: unknown) => toast.error("Save failed", err instanceof Error ? err.message : undefined),
  });

  const del = useMutation({
    mutationFn: async () => deleteMethodConfig(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["method-configs"] });
      toast.success("Method configuration deleted");
      window.location.href = "/method-configs";
    },
    onError: (err: unknown) => toast.error("Delete failed", err instanceof Error ? err.message : undefined),
  });

  const moveDepartment = useMutation({
    mutationFn: async () => {
      await setMethodConfigDepartment(id, { departmentId });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["method-config", id] });
      await qc.invalidateQueries({ queryKey: ["method-configs"] });
      toast.success(
        "Department updated",
        "Config version is unchanged; existing calibrations keep their snapshots.",
      );
    },
    onError: (err: unknown) =>
      toast.error("Could not move department", err instanceof Error ? err.message : undefined),
  });

  const currentDepartmentId = s((q.data as Record<string, unknown> | undefined)?.departmentId);
  const departmentDirty = departmentId !== "" && departmentId !== currentDepartmentId;

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
      <ExcelPageGuide pageKey="method-configs" />
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
            {departmentName ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Department:{" "}
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{departmentName}</span>
              </p>
            ) : null}
            <MethodConfigFormFields form={form} setForm={setForm} disabled={!canEdit} />
            {save.isError ? <div className="text-sm text-red-600">{(save.error as Error).message}</div> : null}
            {versionNote ? <div className="text-sm text-neutral-700 dark:text-neutral-300">{versionNote}</div> : null}
            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={save.isPending}>
                  Save changes
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

      {q.isSuccess && canEdit && !platform ? (
        <Card>
          <div className="text-sm font-medium">Move to department</div>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            Filing change only — does not bump version or append a snapshot.
          </p>
          <div className="mt-3 max-w-md">
            <Label htmlFor="method-config-department">Department</Label>
            <DepartmentPicker
              id="method-config-department"
              value={departmentId}
              onChange={setDepartmentId}
              required
            />
          </div>
          <div className="mt-3">
            <Button
              type="button"
              disabled={moveDepartment.isPending || !departmentDirty}
              onClick={() => moveDepartment.mutate()}
            >
              {moveDepartment.isPending ? "Moving…" : "Save department"}
            </Button>
          </div>
        </Card>
      ) : null}

      <MethodConfigAnalyteCriteriaPanel methodConfigId={id} canEdit={canEdit} />

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          del.mutate();
        }}
        title="Delete this method configuration?"
        message="Calibration groups already computed keep their frozen snapshot, but no new groups can use this config. This cannot be undone."
        confirmLabel="Delete"
        danger
        busy={del.isPending}
      />
    </div>
  );
}
