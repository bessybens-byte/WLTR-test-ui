"use client";

import { DepartmentPicker, useActiveDepartmentCount } from "@/components/department-picker";
import { Button, Card, Input, Label, PageHeader, Textarea } from "@/components/ui";
import { createInstrument } from "@/lib/api/wltr-api";
import { pushRecentInstrument } from "@/lib/client-recent";
import { isPlatformOperator } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NewInstrumentPage() {
  const { me } = useAuth();
  const router = useRouter();
  const platform = isPlatformOperator(me);
  const { count: departmentCount, items: departmentItems, isLoading: deptsLoading } =
    useActiveDepartmentCount();
  const departmentRequired = departmentCount > 1;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    instrumentType: "",
    manufacturer: "",
    model: "",
    serialNumber: "",
    description: "",
    isActive: true,
    departmentId: "",
  });

  useEffect(() => {
    if (departmentCount === 1 && !form.departmentId) {
      const only = departmentItems[0] as Record<string, unknown> | undefined;
      const id = typeof only?.id === "string" ? only.id : "";
      if (id) setForm((f) => ({ ...f, departmentId: id }));
    }
  }, [departmentCount, departmentItems, form.departmentId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (departmentRequired && !form.departmentId) {
      setError("Select a department — this laboratory has more than one.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await createInstrument({
        name: form.name,
        instrumentType: form.instrumentType || undefined,
        manufacturer: form.manufacturer || undefined,
        model: form.model || undefined,
        serialNumber: form.serialNumber || undefined,
        description: form.description || undefined,
        isActive: form.isActive,
        ...(form.departmentId ? { departmentId: form.departmentId } : {}),
      });
      const id = String((res as { id?: string }).id ?? "");
      if (id) pushRecentInstrument(id);
      router.replace(`/instruments/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create instrument");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New instrument"
        description="Register a laboratory instrument for calibration runs and groups."
        actions={
          <Link href="/instruments">
            <Button variant="secondary" type="button">
              All instruments
            </Button>
          </Link>
        }
      />
      <Card>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="name">Display name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="instrumentType">Instrument type</Label>
              <Input
                id="instrumentType"
                placeholder="e.g. GC/MS"
                value={form.instrumentType}
                onChange={(e) => setForm({ ...form, instrumentType: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                value={form.manufacturer}
                onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="model">Model</Label>
              <Input id="model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="serialNumber">Serial number</Label>
              <Input
                id="serialNumber"
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="description">Notes</Label>
            <Textarea
              id="description"
              className="min-h-[80px] font-sans"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          {!platform ? (
            <div>
              <Label htmlFor="departmentId">Department</Label>
              <DepartmentPicker
                id="departmentId"
                value={form.departmentId}
                onChange={(departmentId) => setForm({ ...form, departmentId })}
                required={departmentRequired}
              />
              <p className="mt-1 text-xs text-neutral-500">
                {deptsLoading
                  ? "Loading departments…"
                  : departmentRequired
                    ? "Required when the laboratory has more than one department."
                    : "Optional when the laboratory has a single department (inferred if omitted)."}
              </p>
            </div>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active for new runs
          </label>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <Button
            type="submit"
            disabled={busy || !form.name.trim() || (departmentRequired && !form.departmentId)}
          >
            {busy ? "Creating…" : "Create instrument"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
