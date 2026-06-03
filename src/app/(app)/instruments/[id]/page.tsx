"use client";

import { InstrumentSuppressedAnalytesPanel } from "@/components/instrument-suppressed-analytes-panel";
import { Badge, Button, Card, Input, Label, PageHeader, Textarea } from "@/components/ui";
import { deleteInstrument, getInstrument, updateInstrument } from "@/lib/api/wltr-api";
import { hasPermission, PERMS } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function s(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

type InstrumentForm = {
  name: string;
  instrumentType: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  description: string;
  isActive: boolean;
  rowVersion: string;
};

const emptyForm: InstrumentForm = {
  name: "",
  instrumentType: "",
  manufacturer: "",
  model: "",
  serialNumber: "",
  description: "",
  isActive: true,
  rowVersion: "",
};

export default function InstrumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const canEdit = hasPermission(me, PERMS.configEdit);

  const q = useQuery({
    queryKey: ["instrument", id],
    queryFn: () => getInstrument(id),
    enabled: Boolean(id),
  });

  const [form, setForm] = useState<InstrumentForm>(emptyForm);

  useEffect(() => {
    if (!q.data) return;
    const d = q.data as Record<string, unknown>;
    setForm({
      name: s(d.name),
      instrumentType: s(d.instrumentType),
      manufacturer: s(d.manufacturer),
      model: s(d.model),
      serialNumber: s(d.serialNumber),
      description: s(d.description),
      isActive: Boolean(d.isActive ?? true),
      rowVersion: s(d.rowVersion),
    });
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      await updateInstrument(id, {
        name: form.name,
        instrumentType: form.instrumentType || undefined,
        manufacturer: form.manufacturer || undefined,
        model: form.model || undefined,
        serialNumber: form.serialNumber || undefined,
        description: form.description || undefined,
        isActive: form.isActive,
        rowVersion: form.rowVersion || undefined,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["instrument", id] });
      await qc.invalidateQueries({ queryKey: ["instruments"] });
    },
  });

  const del = useMutation({
    mutationFn: async () => deleteInstrument(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["instruments"] });
      router.replace("/instruments");
    },
  });

  const title = q.isSuccess && form.name.trim() ? form.name : "Instrument";

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={<span className="font-mono text-xs">{id}</span>}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/instruments">
              <Button variant="secondary" type="button">
                All instruments
              </Button>
            </Link>
            <Link href={`/runs?instrumentId=${encodeURIComponent(id)}`}>
              <Button variant="secondary" type="button">
                View runs
              </Button>
            </Link>
            {hasPermission(me, PERMS.runsUpload) ? (
              <Link href={`/runs/upload?instrumentId=${encodeURIComponent(id)}`}>
                <Button type="button">Upload run</Button>
              </Link>
            ) : null}
          </div>
        }
      />

      <Card>
        {q.isLoading ? <div className="text-sm text-neutral-500">Loading instrument…</div> : null}
        {q.isError ? <div className="text-sm text-red-600">{(q.error as Error).message}</div> : null}

        {q.isSuccess ? (
          <>
            <dl className="mb-6 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-neutral-600 dark:text-neutral-400">Status</dt>
                <dd className="mt-1">
                  <Badge tone={form.isActive ? "ok" : "neutral"}>{form.isActive ? "Active" : "Inactive"}</Badge>
                </dd>
              </div>
              {typeof (q.data as Record<string, unknown>).laboratoryId === "string" ? (
                <div>
                  <dt className="text-neutral-600 dark:text-neutral-400">Laboratory</dt>
                  <dd className="mt-1 font-mono text-xs">{String((q.data as Record<string, unknown>).laboratoryId)}</dd>
                </div>
              ) : null}
            </dl>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (canEdit) save.mutate();
              }}
            >
              <div>
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={!canEdit}
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="instrumentType">Instrument type</Label>
                  <Input
                    id="instrumentType"
                    placeholder="e.g. GC/MS"
                    value={form.instrumentType}
                    onChange={(e) => setForm({ ...form, instrumentType: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={form.manufacturer}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="serialNumber">Serial number</Label>
                  <Input
                    id="serialNumber"
                    value={form.serialNumber}
                    onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                    disabled={!canEdit}
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
                  disabled={!canEdit}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  disabled={!canEdit}
                />
                Active for new runs
              </label>

              {save.isError ? <div className="text-sm text-red-600">{(save.error as Error).message}</div> : null}

              {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={save.isPending}>
                    Save changes
                  </Button>
                  <Button type="button" variant="danger" disabled={del.isPending} onClick={() => del.mutate()}>
                    Delete instrument
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  View only. Lab configuration access is required to edit instruments.
                </p>
              )}
            </form>
          </>
        ) : null}
      </Card>

      {q.isSuccess ? <InstrumentSuppressedAnalytesPanel instrumentId={id} canEdit={canEdit} /> : null}
    </div>
  );
}
