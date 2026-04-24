"use client";

import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { createTechnician } from "@/lib/api/wltr-api";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewTechnicianPage() {
  const { me } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    identityUserId: "",
    laboratoryId: me?.laboratoryId ?? "",
    firstName: "",
    lastName: "",
    qualifications: "",
    hireDate: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        identityUserId: form.identityUserId,
        firstName: form.firstName,
        lastName: form.lastName,
        qualifications: form.qualifications || undefined,
        hireDate: form.hireDate ? new Date(form.hireDate).toISOString() : undefined,
      };
      if (!me?.laboratoryId) {
        payload.laboratoryId = form.laboratoryId || undefined;
      }
      const res = await createTechnician(payload);
      const id = String((res as { id?: string }).id ?? "");
      router.replace(`/technicians/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="New technician" description="Links an Identity user to a technician profile." />
      <Card>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="identityUserId">Identity user id</Label>
            <Input
              id="identityUserId"
              value={form.identityUserId}
              onChange={(e) => setForm({ ...form, identityUserId: e.target.value })}
              required
            />
          </div>
          {!me?.laboratoryId ? (
            <div>
              <Label htmlFor="laboratoryId">Laboratory id (required for platform)</Label>
              <Input
                id="laboratoryId"
                value={form.laboratoryId}
                onChange={(e) => setForm({ ...form, laboratoryId: e.target.value })}
                required
              />
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </div>
          </div>
          <div>
            <Label htmlFor="qualifications">Qualifications</Label>
            <Input
              id="qualifications"
              value={form.qualifications}
              onChange={(e) => setForm({ ...form, qualifications: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="hireDate">Hire date</Label>
            <Input id="hireDate" type="datetime-local" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
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
