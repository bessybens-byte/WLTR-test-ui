"use client";

import { Button, Card, Input, Label, PageHeader, Select } from "@/components/ui";
import { createMethodConfig } from "@/lib/api/wltr-api";
import { QUANTITATION_MODE_LABEL } from "@/lib/types/wltr";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewMethodConfigPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    labelMode: 0,
    quantitationMode: 0,
    minCorrelation: 0.99,
    maxRSE: 0,
    pctDiffLowBound: -20,
    pctDiffHighBound: 20,
    minPointsRequired: 5,
    maxMissedPoints: 0,
    icvLimitPercent: 20,
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
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <div className="mb-3 text-sm font-medium">Methodology</div>
            <p className="mb-3 text-xs text-neutral-600 dark:text-neutral-400">
              Regression variants are computed per calibration group; this config stores quantitation mode (curve Y
              source), label mode, and acceptance thresholds only.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="lm">Label mode (0–1)</Label>
              <Select
                id="lm"
                value={String(form.labelMode)}
                onChange={(e) => setForm({ ...form, labelMode: Number(e.target.value) })}
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
              />
            </div>
            <div>
              <Label htmlFor="maxRSE">maxRSE</Label>
              <Input id="maxRSE" type="number" step="0.0001" value={form.maxRSE} onChange={(e) => setForm({ ...form, maxRSE: Number(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="pctDiffLowBound">pctDiffLowBound</Label>
              <Input
                id="pctDiffLowBound"
                type="number"
                step="0.0001"
                value={form.pctDiffLowBound}
                onChange={(e) => setForm({ ...form, pctDiffLowBound: Number(e.target.value) })}
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
              />
            </div>
            <div>
              <Label htmlFor="minPointsRequired">minPointsRequired</Label>
              <Input
                id="minPointsRequired"
                type="number"
                value={form.minPointsRequired}
                onChange={(e) => setForm({ ...form, minPointsRequired: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="maxMissedPoints">maxMissedPoints</Label>
              <Input
                id="maxMissedPoints"
                type="number"
                value={form.maxMissedPoints}
                onChange={(e) => setForm({ ...form, maxMissedPoints: Number(e.target.value) })}
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
              />
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              IS response bounds (optional)
            </div>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
              Inclusive thresholds on <strong>mean</strong> internal-standard response for summary warnings (
              <code className="text-[11px]">internalStandardResponseMin</code> /{" "}
              <code className="text-[11px]">Max</code>). Leave blank for no bound.
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
                />
              </div>
            </div>
          </div>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <Button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
