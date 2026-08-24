"use client";

import { Button, Card, Input, Label, PageHeader, Textarea } from "@/components/ui";
import { createDepartment } from "@/lib/api/wltr-api";
import { PERMS, hasPermission } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NewDepartmentPage() {
  const { me } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  useEffect(() => {
    if (!hasPermission(me, PERMS.departmentsManage)) router.replace("/departments");
  }, [me, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await createDepartment({
        name: form.name.trim(),
        description: form.description.trim() || null,
      });
      const id = String((res as { id?: string }).id ?? "");
      router.replace(`/departments/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (!hasPermission(me, PERMS.departmentsManage)) return null;

  return (
    <div>
      <PageHeader
        title="New department"
        description="Created active in your laboratory. Use deactivate later to retire a bench."
      />
      <Card>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              maxLength={256}
              placeholder="e.g. Volatiles"
            />
            <p className="mt-1 text-xs text-neutral-500">Must include an alphanumeric character; unique per laboratory.</p>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              className="min-h-[80px] font-sans"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={2000}
              placeholder="Optional — e.g. Purge and trap bench"
            />
          </div>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <Button type="submit" disabled={busy || !form.name.trim()}>
            {busy ? "Creating…" : "Create"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
