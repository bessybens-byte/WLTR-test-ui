"use client";

import { MethodConfigAnalyteCriteriaPanel } from "@/components/method-config-analyte-criteria-panel";
import { MethodConfigFormFields, type MethodConfigFormState } from "@/components/method-config-form-fields";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { Button, Card, PageHeader } from "@/components/ui";
import { deleteMethodConfig, getMethodConfig, updateMethodConfig } from "@/lib/api/wltr-api";
import { hasPermission, PERMS } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
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
  const [form, setForm] = useState<MethodConfigFormState>(defaultForm);
  const [versionNote, setVersionNote] = useState<string | null>(null);

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
            <MethodConfigFormFields form={form} setForm={setForm} disabled={!canEdit} />
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
      <MethodConfigAnalyteCriteriaPanel methodConfigId={id} canEdit={canEdit} />
    </div>
  );
}
