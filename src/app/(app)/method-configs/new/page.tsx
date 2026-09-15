"use client";

import { DepartmentPicker, useActiveDepartmentCount } from "@/components/department-picker";
import { CalibrationLevelSetPicker } from "@/components/calibration-level-set-picker";
import { MethodConfigFormFields, type MethodConfigFormState } from "@/components/method-config-form-fields";
import { ExcelPageGuide } from "@/components/excel-annotation";
import { Button, Card, Label, PageHeader } from "@/components/ui";
import { createMethodConfig, getMethodConfigFamilyDefaults } from "@/lib/api/wltr-api";
import { isPlatformOperator } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NewMethodConfigPage() {
  const { me } = useAuth();
  const platform = isPlatformOperator(me);
  const router = useRouter();
  const { count: departmentCount, items: departmentItems } = useActiveDepartmentCount();
  const departmentRequired = departmentCount > 1;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState("");
  const [calibrationLevelSetId, setCalibrationLevelSetId] = useState("");
  const [form, setForm] = useState<MethodConfigFormState>({
    name: "",
    methodFamily: "",
    labelMode: "RSquared",
    quantitationMode: "InternalStandard",
    minCorrelation: 0.99,
    maxRSE: 0,
    pctDiffLowBound: -20,
    pctDiffHighBound: 20,
    minPointsRequired: 5,
    maxMissedPoints: 0,
    icvLimitPercent: 20,
    rsdPercentLimit: 15,
    isRsdPercentLimit: 20,
    icvCdsParityPercent: 0.01,
    soilDilutionFactor: "",
    aqueousDilutionFactor: "",
    internalStandardResponseMin: "",
    internalStandardResponseMax: "",
  });

  const familyDefaultsQuery = useQuery({
    queryKey: ["method-config-family-defaults"],
    queryFn: () => getMethodConfigFamilyDefaults(),
  });

  useEffect(() => {
    if (departmentCount === 1 && !departmentId) {
      const only = departmentItems[0] as Record<string, unknown> | undefined;
      const id = typeof only?.id === "string" ? only.id : "";
      if (id) setDepartmentId(id);
    }
  }, [departmentCount, departmentItems, departmentId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (departmentRequired && !departmentId) {
      setError("Select a department — this laboratory has more than one.");
      return;
    }
    if (!calibrationLevelSetId) {
      setError("Select a calibration level set — the method must evaluate against a ladder.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await createMethodConfig({
        ...form,
        methodFamily: form.methodFamily || undefined,
        calibrationLevelSetId,
        soilDilutionFactor: form.soilDilutionFactor === "" ? null : Number(form.soilDilutionFactor),
        aqueousDilutionFactor: form.aqueousDilutionFactor === "" ? null : Number(form.aqueousDilutionFactor),
        internalStandardResponseMin:
          form.internalStandardResponseMin === "" ? null : Number(form.internalStandardResponseMin),
        internalStandardResponseMax:
          form.internalStandardResponseMax === "" ? null : Number(form.internalStandardResponseMax),
        ...(departmentId ? { departmentId } : {}),
      });
      const id = String((res as { id?: string }).id ?? "");
      router.replace(`/method-configs/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="New method configuration" />
      <ExcelPageGuide pageKey="method-configs" />
      <Card>
        <form className="space-y-4" onSubmit={onSubmit}>
          <MethodConfigFormFields
            form={form}
            setForm={setForm}
            nameRequired
            familyDefaults={familyDefaultsQuery.data}
          />
          {!platform ? (
            <div>
              <Label htmlFor="departmentId">Department</Label>
              <DepartmentPicker
                id="departmentId"
                value={departmentId}
                onChange={setDepartmentId}
                required={departmentRequired}
              />
              <p className="mt-1 text-xs text-neutral-500">
                {departmentRequired
                  ? "Required when the laboratory has more than one department."
                  : "Optional when the laboratory has a single department (inferred if omitted)."}
              </p>
            </div>
          ) : null}
          <div>
            <Label htmlFor="calibrationLevelSetId">Calibration level set</Label>
            <CalibrationLevelSetPicker
              id="calibrationLevelSetId"
              value={calibrationLevelSetId}
              onChange={setCalibrationLevelSetId}
              required
              departmentId={departmentId || undefined}
            />
            <p className="mt-1 text-xs text-neutral-500">
              The ladder this method evaluates against. Must belong to the same department as the method config.
            </p>
          </div>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <Button type="submit" disabled={busy || (departmentRequired && !departmentId) || !calibrationLevelSetId}>
            {busy ? "Creating…" : "Create"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
