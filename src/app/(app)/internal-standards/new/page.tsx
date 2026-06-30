"use client";

import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { createInternalStandard } from "@/lib/api/wltr-api";
import { PERMS, hasPermission } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NewInternalStandardPage() {
  const router = useRouter();
  const { me } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", casNumber: "", concentration: "" });

  useEffect(() => {
    if (!hasPermission(me, PERMS.configEdit)) router.replace("/internal-standards");
  }, [me, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await createInternalStandard({
        name: form.name,
        casNumber: form.casNumber || undefined,
        concentration: form.concentration === "" ? undefined : Number(form.concentration),
      });
      const id = String((res as { id?: string }).id ?? "");
      router.replace(`/internal-standards/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (!hasPermission(me, PERMS.configEdit)) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="New internal standard"
        description="Add a catalog row. The name is matched to internal-standard compound lines in uploaded runs."
        actions={
          <Link href="/internal-standards">
            <Button variant="secondary" type="button">
              Back to list
            </Button>
          </Link>
        }
      />
      <Card>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="casNumber">CAS number</Label>
            <Input id="casNumber" value={form.casNumber} onChange={(e) => setForm({ ...form, casNumber: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="concentration">Spike concentration</Label>
            <Input
              id="concentration"
              type="number"
              step="any"
              min="0"
              value={form.concentration}
              onChange={(e) => setForm({ ...form, concentration: e.target.value })}
              placeholder="Optional — e.g. µg/L for amount ratios"
            />
          </div>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create"}
            </Button>
            <Link href="/internal-standards">
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
