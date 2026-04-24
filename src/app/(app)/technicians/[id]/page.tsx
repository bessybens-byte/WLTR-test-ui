"use client";

import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { getTechnician, updateTechnician } from "@/lib/api/wltr-api";
import { PERMS, hasPermission } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function TechnicianDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["technician", id],
    queryFn: () => getTechnician(id),
    enabled: !!id,
  });
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    qualifications: "",
    hireDate: "",
    isActive: true,
  });

  useEffect(() => {
    if (!q.data) return;
    const d = q.data as Record<string, unknown>;
    setForm({
      firstName: String(d.firstName ?? ""),
      lastName: String(d.lastName ?? ""),
      qualifications: String(d.qualifications ?? ""),
      hireDate: d.hireDate ? String(d.hireDate).slice(0, 16) : "",
      isActive: Boolean(d.isActive ?? true),
    });
  }, [q.data]);

  const mutate = useMutation({
    mutationFn: async () => {
      await updateTechnician(id, {
        firstName: form.firstName,
        lastName: form.lastName,
        qualifications: form.qualifications || undefined,
        hireDate: form.hireDate ? new Date(form.hireDate).toISOString() : undefined,
        isActive: form.isActive,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["technician", id] });
    },
  });

  const canEdit = hasPermission(me, PERMS.usersManageLab);

  return (
    <div>
      <PageHeader title="Technician" description={id} />
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
              <div>
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="qualifications">Qualifications</Label>
              <Input
                id="qualifications"
                value={form.qualifications}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, qualifications: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="hireDate">Hire date</Label>
              <Input
                id="hireDate"
                type="datetime-local"
                value={form.hireDate}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            {mutate.isError ? <div className="text-sm text-red-600">{(mutate.error as Error).message}</div> : null}
            {canEdit ? (
              <Button type="submit" disabled={mutate.isPending}>
                {mutate.isPending ? "Saving…" : "Save"}
              </Button>
            ) : (
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Read-only</div>
            )}
          </form>
        ) : null}
      </Card>
    </div>
  );
}
