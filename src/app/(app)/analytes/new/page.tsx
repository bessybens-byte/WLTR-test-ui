"use client";

import { AnalyteInternalStandardSelect } from "@/components/analyte-internal-standard-select";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { createAnalyte } from "@/lib/api/wltr-api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewAnalytePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    casNumber: "",
    defaultInternalStandardId: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await createAnalyte({
        name: form.name,
        casNumber: form.casNumber || undefined,
        defaultInternalStandardId: form.defaultInternalStandardId || undefined,
      });
      const id = String((res as { id?: string }).id ?? "");
      router.replace(`/analytes/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New analyte"
        description="Canonical name and optional default internal standard for run normalization."
      />
      <Card>
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="space-y-4">
            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Identity</div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="casNumber">CAS number</Label>
              <Input id="casNumber" value={form.casNumber} onChange={(e) => setForm({ ...form, casNumber: e.target.value })} />
            </div>
          </div>
          <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Internal standard</div>
                <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                  Links this analyte to a catalog entry. The server matches that name to IS rows in uploads.
                </p>
              </div>
              <Link
                className="shrink-0 text-sm font-medium text-neutral-900 underline underline-offset-2 dark:text-neutral-100"
                href="/internal-standards"
              >
                Catalog
              </Link>
            </div>
            <AnalyteInternalStandardSelect
              label="Default internal standard"
              value={form.defaultInternalStandardId}
              onChange={(internalStandardId) =>
                setForm({ ...form, defaultInternalStandardId: internalStandardId })
              }
            />
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
