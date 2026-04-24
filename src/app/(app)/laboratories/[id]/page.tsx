"use client";

import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { getLaboratory, updateLaboratory } from "@/lib/api/wltr-api";
import { PERMS, hasPermission } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function LaboratoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["laboratory", id],
    queryFn: () => getLaboratory(id),
    enabled: !!id,
  });
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
    isActive: true,
  });

  useEffect(() => {
    if (!q.data) return;
    const d = q.data as Record<string, unknown>;
    setForm({
      name: String(d.name ?? ""),
      address: String(d.address ?? ""),
      city: String(d.city ?? ""),
      state: String(d.state ?? ""),
      zipCode: String(d.zipCode ?? ""),
      accreditationId: String(d.accreditationId ?? ""),
      contactName: String(d.contactName ?? ""),
      contactEmail: String(d.contactEmail ?? ""),
      contactPhone: String(d.contactPhone ?? ""),
      isActive: Boolean(d.isActive ?? true),
    });
  }, [q.data]);

  const mutate = useMutation({
    mutationFn: async () => {
      await updateLaboratory(id, form);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["laboratory", id] });
    },
  });

  const canEdit = hasPermission(me, PERMS.laboratoriesManage);

  return (
    <div>
      <PageHeader title="Laboratory" description={id} />
      <Card>
        {q.isLoading ? <div className="text-sm">Loading…</div> : null}
        {q.isError ? <div className="text-sm text-red-600">{(q.error as Error).message}</div> : null}
        {q.isSuccess ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutate.mutate();
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} disabled={!canEdit} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input id="state" value={form.state} disabled={!canEdit} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="zipCode">ZIP</Label>
                <Input
                  id="zipCode"
                  value={form.zipCode}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="accreditationId">Accreditation id</Label>
                <Input
                  id="accreditationId"
                  value={form.accreditationId}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, accreditationId: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contactName">Contact name</Label>
                <Input
                  id="contactName"
                  value={form.contactName}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contactEmail">Contact email</Label>
                <Input
                  id="contactEmail"
                  value={form.contactEmail}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">Contact phone</Label>
                <Input
                  id="contactPhone"
                  value={form.contactPhone}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={form.isActive}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            {mutate.isError ? <div className="text-sm text-red-600">{(mutate.error as Error).message}</div> : null}
            {canEdit ? (
              <Button type="submit" disabled={mutate.isPending}>
                {mutate.isPending ? "Saving…" : "Save changes"}
              </Button>
            ) : (
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Read-only (missing perm.laboratories.manage)</div>
            )}
          </form>
        ) : null}
      </Card>
    </div>
  );
}
