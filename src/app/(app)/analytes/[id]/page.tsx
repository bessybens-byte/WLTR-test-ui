"use client";

import { AnalyteInternalStandardSelect } from "@/components/analyte-internal-standard-select";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import {
  createAnalyteAlias,
  deleteAnalyte,
  deleteAnalyteAlias,
  getAnalyte,
  updateAnalyte,
  updateAnalyteAlias,
} from "@/lib/api/wltr-api";
import { hasPermission, PERMS } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AnalyteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useAuth();
  const canEdit = hasPermission(me, PERMS.configEdit);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["analyte", id],
    queryFn: () => getAnalyte(id),
    enabled: !!id,
  });

  const [form, setForm] = useState({
    name: "",
    casNumber: "",
    defaultInternalStandardId: "",
  });
  const [aliasName, setAliasName] = useState("");
  const [aliasEdits, setAliasEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!q.data) return;
    const d = q.data as Record<string, unknown>;
    setForm({
      name: String(d.name ?? ""),
      casNumber: String(d.casNumber ?? ""),
      defaultInternalStandardId: String(d.defaultInternalStandardId ?? ""),
    });
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      await updateAnalyte(id, {
        name: form.name,
        casNumber: form.casNumber || undefined,
        defaultInternalStandardId: form.defaultInternalStandardId || undefined,
      });
    },
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["analyte", id] }),
  });

  const del = useMutation({
    mutationFn: async () => deleteAnalyte(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["analytes"] });
      window.location.href = "/analytes";
    },
  });

  const addAlias = useMutation({
    mutationFn: async () => createAnalyteAlias(id, { aliasName }),
    onSuccess: async () => {
      setAliasName("");
      await qc.invalidateQueries({ queryKey: ["analyte", id] });
    },
  });

  async function saveAlias(aliasId: string) {
    const name = aliasEdits[aliasId];
    if (!name) return;
    await updateAnalyteAlias(aliasId, { aliasName: name });
    await qc.invalidateQueries({ queryKey: ["analyte", id] });
  }

  async function removeAlias(aliasId: string) {
    await deleteAnalyteAlias(aliasId);
    await qc.invalidateQueries({ queryKey: ["analyte", id] });
  }

  const aliases = ((q.data as { aliases?: { id: string; aliasName?: string | null }[] } | undefined)?.aliases ?? []).filter(
    Boolean,
  );
  const defaultInternalStandardName =
    typeof (q.data as { defaultInternalStandardName?: unknown } | undefined)?.defaultInternalStandardName === "string"
      ? (q.data as { defaultInternalStandardName: string }).defaultInternalStandardName
      : null;
  const defaultInternalStandardId = form.defaultInternalStandardId.trim();

  return (
    <div className="space-y-6">
      <PageHeader title="Analyte" description={id} />
      <Card>
        {q.isLoading ? <div className="text-sm">Loading…</div> : null}
        {q.isError ? <div className="text-sm text-red-600">{(q.error as Error).message}</div> : null}
        {q.isSuccess ? (
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (canEdit) save.mutate();
            }}
          >
            <div className="space-y-4">
              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Identity</div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!canEdit} />
              </div>
              <div>
                <Label htmlFor="casNumber">CAS</Label>
                <Input id="casNumber" value={form.casNumber} onChange={(e) => setForm({ ...form, casNumber: e.target.value })} disabled={!canEdit} />
              </div>
            </div>
            <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Internal standard</div>
                  <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                    Used to resolve IS compound rows and compute response ratios on uploaded runs.
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
                resolvedName={defaultInternalStandardName}
                onChange={(internalStandardId) =>
                  setForm({ ...form, defaultInternalStandardId: internalStandardId })
                }
                disabled={!canEdit}
              />
              {defaultInternalStandardId ? (
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Assigned:{" "}
                  <Link
                    className="font-medium text-neutral-900 underline underline-offset-2 dark:text-neutral-100"
                    href={`/internal-standards/${defaultInternalStandardId}`}
                  >
                    {defaultInternalStandardName?.trim() || defaultInternalStandardId}
                  </Link>
                </p>
              ) : (
                <p className="text-xs text-neutral-600 dark:text-neutral-400">No default internal standard assigned.</p>
              )}
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
              <ViewOnlyNotice />
            )}
          </form>
        ) : null}
      </Card>

      <Card>
        <div className="text-sm font-medium">Aliases</div>
        {!canEdit ? (
          <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
            Raw compound names that map to this analyte on run upload.
          </p>
        ) : null}
        {canEdit ? (
        <form
          className="mt-3 flex flex-col gap-2 md:flex-row md:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            addAlias.mutate();
          }}
        >
          <div className="min-w-[240px] flex-1">
            <Label htmlFor="aliasName">New alias</Label>
            <Input id="aliasName" value={aliasName} onChange={(e) => setAliasName(e.target.value)} />
          </div>
          <Button type="submit" disabled={addAlias.isPending}>
            Add
          </Button>
        </form>
        ) : null}
        <div className="mt-4 space-y-3">
          {aliases.map((a) => (
            <div key={a.id} className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800 md:flex-row md:items-center">
              <Input
                value={aliasEdits[a.id] ?? a.aliasName ?? ""}
                onChange={(e) => setAliasEdits((prev) => ({ ...prev, [a.id]: e.target.value }))}
                disabled={!canEdit}
              />
              {canEdit ? (
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => void saveAlias(a.id)}>
                  Rename
                </Button>
                <Button type="button" variant="danger" onClick={() => void removeAlias(a.id)}>
                  Delete
                </Button>
              </div>
              ) : null}
            </div>
          ))}
          {!aliases.length ? <p className="text-sm text-neutral-500">No aliases yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}
