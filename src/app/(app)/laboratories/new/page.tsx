"use client";

import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { createLaboratory } from "@/lib/api/wltr-api";
import { PERMS, hasPermission } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NewLaboratoryPage() {
  const { me } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    accreditationId: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });

  useEffect(() => {
    if (!hasPermission(me, PERMS.laboratoriesCreate)) router.replace("/laboratories");
  }, [me, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await createLaboratory(form);
      const id = String((res as { id?: string }).id ?? "");
      router.replace(`/laboratories/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (!hasPermission(me, PERMS.laboratoriesCreate)) return null;

  return (
    <div>
      <PageHeader title="New laboratory" description="Platform-only laboratory creation." />
      <Card>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="zipCode">ZIP</Label>
              <Input id="zipCode" value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="accreditationId">Accreditation id</Label>
              <Input
                id="accreditationId"
                value={form.accreditationId}
                onChange={(e) => setForm({ ...form, accreditationId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="contactName">Contact name</Label>
              <Input id="contactName" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact email</Label>
              <Input id="contactEmail" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="contactPhone">Contact phone</Label>
              <Input id="contactPhone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
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
