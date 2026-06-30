"use client";

import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { deleteInternalStandard, getInternalStandard, updateInternalStandard } from "@/lib/api/wltr-api";
import { PERMS, hasPermission } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function InternalStandardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useAuth();
  const qc = useQueryClient();
  const canEdit = hasPermission(me, PERMS.configEdit);

  const q = useQuery({
    queryKey: ["internal-standard", id],
    queryFn: () => getInternalStandard(id),
    enabled: !!id,
  });

  const [form, setForm] = useState({ name: "", casNumber: "", concentration: "" });

  useEffect(() => {
    if (!q.data) return;
    const d = q.data as Record<string, unknown>;
    setForm({
      name: String(d.name ?? ""),
      casNumber: String(d.casNumber ?? ""),
      concentration: d.concentration == null ? "" : String(d.concentration),
    });
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      await updateInternalStandard(id, {
        name: form.name,
        casNumber: form.casNumber || undefined,
        concentration: form.concentration === "" ? null : Number(form.concentration),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["internal-standard", id] });
      await qc.invalidateQueries({ queryKey: ["internal-standards"] });
    },
  });

  const del = useMutation({
    mutationFn: async () => deleteInternalStandard(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["internal-standards"] });
      window.location.href = "/internal-standards";
    },
  });

  const displayName = q.isSuccess ? String((q.data as Record<string, unknown>).name ?? "").trim() : "";
  const title = q.isSuccess && displayName ? displayName : "Internal standard";
  const linkedAnalytes = (
    (q.data as { analytes?: { id?: string; name?: string | null }[] } | undefined)?.analytes ?? []
  ).filter((a): a is { id: string; name?: string | null } => typeof a.id === "string" && a.id.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={id ? <span className="font-mono text-xs text-neutral-500 dark:text-neutral-500">{id}</span> : undefined}
        actions={
          <Link href="/internal-standards">
            <Button variant="secondary" type="button">
              All standards
            </Button>
          </Link>
        }
      />
      <Card>
        {q.isLoading ? <div className="text-sm">Loading…</div> : null}
        {q.isError ? <div className="text-sm text-red-600">{(q.error as Error).message}</div> : null}
        {q.isSuccess ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (canEdit) save.mutate();
            }}
          >
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={!canEdit}
              />
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                Must align with internal-standard compound names in run files for response ratios.
              </p>
            </div>
            <div>
              <Label htmlFor="casNumber">CAS number</Label>
              <Input
                id="casNumber"
                value={form.casNumber}
                onChange={(e) => setForm({ ...form, casNumber: e.target.value })}
                disabled={!canEdit}
              />
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
                disabled={!canEdit}
                placeholder="Optional — used for concentrationRatio / responseFactor on measurements"
              />
            </div>
            {save.isError ? <div className="text-sm text-red-600">{(save.error as Error).message}</div> : null}
            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={save.isPending}>
                  Save
                </Button>
                <Button type="button" variant="danger" disabled={del.isPending} onClick={() => del.mutate()}>
                  Delete
                </Button>
              </div>
            ) : (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                View only. Ask a lab admin to grant lab configuration access to edit this catalog.
              </p>
            )}
          </form>
        ) : null}
      </Card>

      {q.isSuccess ? (
        <Card>
          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Analytes using this standard</div>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            Canonical analytes in this laboratory with this internal standard as their default assignment.
          </p>
          {linkedAnalytes.length ? (
            <ul className="mt-4 space-y-2">
              {linkedAnalytes.map((a) => (
                <li key={a.id}>
                  <Link
                    className="text-sm font-medium text-neutral-900 underline underline-offset-2 dark:text-neutral-100"
                    href={`/analytes/${a.id}`}
                  >
                    {a.name?.trim() || a.id}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-neutral-500">No analytes currently use this internal standard.</p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
