"use client";

import { RunMeasurementsTable } from "@/components/run-measurements-table";
import { Button, Card, Input, Label, PageHeader, Select } from "@/components/ui";
import { InternalStandardSummariesPanel } from "@/components/internal-standard-summaries-panel";
import {
  deleteRun,
  getRun,
  getRunMeasurements,
  getRunValidation,
  resolveAnalyteMapping,
} from "@/lib/api/wltr-api";
import { PERMS, hasPermission } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { me } = useAuth();
  const qc = useQueryClient();
  const canDeleteRun = hasPermission(me, PERMS.runsDelete);

  const run = useQuery({
    queryKey: ["run", id],
    queryFn: () => getRun(id),
    enabled: !!id,
  });
  const measurements = useQuery({
    queryKey: ["run", id, "measurements"],
    queryFn: () => getRunMeasurements(id),
    enabled: !!id,
  });
  const validation = useQuery({
    queryKey: ["run", id, "validation"],
    queryFn: () => getRunValidation(id),
    enabled: !!id,
  });

  const unresolvedRows = useMemo(() => {
    const rows = measurements.data ?? [];
    return rows.filter((r) => {
      const x = r as Record<string, unknown>;
      return x.isResolved === false;
    });
  }, [measurements.data]);

  const [resolve, setResolve] = useState({
    rawCompoundName: "",
    analyteId: "",
    saveAsAlias: true,
    applyScope: 0,
  });

  const resolveMut = useMutation({
    mutationFn: async () =>
      resolveAnalyteMapping(id, {
        rawCompoundName: resolve.rawCompoundName,
        analyteId: resolve.analyteId,
        saveAsAlias: resolve.saveAsAlias,
        applyScope: resolve.applyScope,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["run", id] });
      await qc.invalidateQueries({ queryKey: ["run", id, "measurements"] });
      await qc.invalidateQueries({ queryKey: ["run", id, "validation"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteRun(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["runs"] });
      router.push("/runs");
    },
  });

  function requestDeleteRun() {
    const ok = window.confirm(
      "Delete this run? It must not be linked to any calibration group. Soft-deleted runs are hidden from reads; raw text stays in the database for audit.",
    );
    if (ok) deleteMut.mutate();
  }

  const runTitle =
    run.isSuccess && typeof (run.data as Record<string, unknown>).name === "string"
      ? String((run.data as Record<string, unknown>).name).trim()
      : "";
  const headerDescription = runTitle ? `${runTitle} · ${id}` : id;

  return (
    <div className="space-y-6">
      <PageHeader title="Run" description={headerDescription} />

      <Card>
        <div className="text-sm font-medium">Detail</div>
        <div className="mt-3">
          {run.isLoading ? <div className="text-sm">Loading…</div> : null}
          {run.isError ? <div className="text-sm text-red-600">{(run.error as Error).message}</div> : null}
          {run.isSuccess ? <pre className="overflow-x-auto text-xs">{JSON.stringify(run.data, null, 2)}</pre> : null}
        </div>
      </Card>

      <Card>
        <div className="text-sm font-medium">Measurements</div>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Parsed compound rows with instrument fields and IS-derived amount ratios (null when IS concentration is not
          configured on the default internal standard).
        </p>
        <div className="mt-3">
          {measurements.isLoading ? <div className="text-sm">Loading…</div> : null}
          {measurements.isError ? <div className="text-sm text-red-600">{(measurements.error as Error).message}</div> : null}
          {measurements.isSuccess ? (
            <RunMeasurementsTable rows={(measurements.data ?? []) as Record<string, unknown>[]} />
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="text-sm font-medium">Validation</div>
        <div className="mt-3">
          {validation.isLoading ? <div className="text-sm">Loading…</div> : null}
          {validation.isError ? <div className="text-sm text-red-600">{(validation.error as Error).message}</div> : null}
          {validation.isSuccess ? <pre className="overflow-x-auto text-xs">{JSON.stringify(validation.data, null, 2)}</pre> : null}
        </div>
      </Card>

      <InternalStandardSummariesPanel variant="run" resourceId={id} me={me} />

      <Card>
        <div className="text-sm font-medium">Resolve analyte mapping</div>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Unresolved rows detected: {unresolvedRows.length}. Fill fields to call POST /runs/{"{id}"}/analyte-mapping/resolve.
        </p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            resolveMut.mutate();
          }}
        >
          <div>
            <Label htmlFor="rawCompoundName">rawCompoundName</Label>
            <Input
              id="rawCompoundName"
              value={resolve.rawCompoundName}
              onChange={(e) => setResolve({ ...resolve, rawCompoundName: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="analyteId">analyteId</Label>
            <Input id="analyteId" value={resolve.analyteId} onChange={(e) => setResolve({ ...resolve, analyteId: e.target.value })} required />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="saveAsAlias"
              type="checkbox"
              checked={resolve.saveAsAlias}
              onChange={(e) => setResolve({ ...resolve, saveAsAlias: e.target.checked })}
            />
            <Label htmlFor="saveAsAlias">saveAsAlias</Label>
          </div>
          <div>
            <Label htmlFor="applyScope">applyScope (only if saveAsAlias is false)</Label>
            <Select
              id="applyScope"
              value={String(resolve.applyScope)}
              onChange={(e) => setResolve({ ...resolve, applyScope: Number(e.target.value) })}
            >
              <option value={0}>RunOnly (0)</option>
              <option value={1}>Laboratory (1)</option>
            </Select>
          </div>
          {resolveMut.isError ? <div className="text-sm text-red-600">{(resolveMut.error as Error).message}</div> : null}
          {resolveMut.isSuccess ? (
            <div className="text-sm text-neutral-700 dark:text-neutral-300">
              {JSON.stringify(resolveMut.data)}
            </div>
          ) : null}
          <Button type="submit" disabled={resolveMut.isPending}>
            Resolve
          </Button>
        </form>
      </Card>

      {canDeleteRun ? (
        <Card>
          <div className="text-sm font-medium text-red-700 dark:text-red-400">Delete run</div>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Requires <code className="rounded bg-neutral-100 px-1 text-xs dark:bg-neutral-800">perm.runs.delete</code>.
            Soft-deletes the run when it is not a member of any calibration group. If the run is still in a group, the
            server returns 409 — remove it from groups first.
          </p>
          {deleteMut.isError ? <div className="mt-2 text-sm text-red-600">{(deleteMut.error as Error).message}</div> : null}
          <div className="mt-4">
            <Button variant="danger" disabled={deleteMut.isPending} onClick={requestDeleteRun}>
              {deleteMut.isPending ? "Deleting…" : "Delete run"}
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
