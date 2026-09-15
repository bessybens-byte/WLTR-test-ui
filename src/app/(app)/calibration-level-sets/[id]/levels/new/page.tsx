"use client";

import { ExcelAnnotation } from "@/components/excel-annotation";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { createCalibrationLevel } from "@/lib/api/wltr-api";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function NewCalibrationLevelPage() {
  const { id: setId } = useParams<{ id: string }>();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    levelName: "",
    trueConcentration: 0,
    sortOrder: 0,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await createCalibrationLevel(setId, form);
      const levelId = String((res as { id?: string }).id ?? "");
      router.replace(`/calibration-level-sets/${setId}/levels/${levelId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New calibration level"
        description={<span className="font-mono text-xs">{setId}</span>}
      />
      <Card>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="levelName">Level name</Label>
            <ExcelAnnotation fieldKey="calLevel.levelName" />
            <Input
              id="levelName"
              value={form.levelName}
              onChange={(e) => setForm({ ...form, levelName: e.target.value })}
              required
            />
            <p className="mt-1 text-xs text-neutral-500">Unique within this set (after normalization).</p>
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
                required
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
                required
              />
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
