"use client";

import { MethodConfigFormFields, type MethodConfigFormState } from "@/components/method-config-form-fields";
import { Button, Card, PageHeader } from "@/components/ui";
import { createMethodConfig } from "@/lib/api/wltr-api";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewMethodConfigPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<MethodConfigFormState>({
    name: "",
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await createMethodConfig({
        ...form,
        soilDilutionFactor: form.soilDilutionFactor === "" ? null : Number(form.soilDilutionFactor),
        aqueousDilutionFactor: form.aqueousDilutionFactor === "" ? null : Number(form.aqueousDilutionFactor),
        internalStandardResponseMin:
          form.internalStandardResponseMin === "" ? null : Number(form.internalStandardResponseMin),
        internalStandardResponseMax:
          form.internalStandardResponseMax === "" ? null : Number(form.internalStandardResponseMax),
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
      <Card>
        <form className="space-y-4" onSubmit={onSubmit}>
          <MethodConfigFormFields form={form} setForm={setForm} nameRequired />
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <Button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
