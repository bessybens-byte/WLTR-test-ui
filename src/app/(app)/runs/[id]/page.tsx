"use client";

import { ConfirmDialog } from "@/components/modal";
import { ExcelAnnotation, ExcelPageGuide, ExcelSectionHint } from "@/components/excel-annotation";
import { RunMeasurementsTable } from "@/components/run-measurements-table";
import { Badge, Button, Callout, Card, Label, PageHeader, Select, SkeletonLines } from "@/components/ui";
import { InternalStandardSummariesPanel } from "@/components/internal-standard-summaries-panel";
import {
  deleteRun,
  getRun,
  getInstrument,
  getRunMeasurements,
  getRunValidation,
  listAnalytes,
  resolveAnalyteMapping,
} from "@/lib/api/wltr-api";
import { PERMS, RUN_STATUS_LABEL, RUN_TYPE_LABEL, hasPermission } from "@/lib/types/wltr";
import { useToast } from "@/providers/toast-provider";
import { useAuth } from "@/providers/auth-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function s(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function runStatusTone(status: number): "ok" | "warn" | "bad" | "neutral" {
  if (status === 0) return "ok";
  if (status === 1) return "warn";
  if (status === 2) return "bad";
  return "neutral";
}

function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-neutral-100 py-2 last:border-b-0 dark:border-neutral-900 sm:flex-row sm:gap-4">
      <dt className="w-40 shrink-0 text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

type ValidationIssue = { severity: string; code: string; message: string; compound?: string };

function collectIssues(data: Record<string, unknown> | undefined): ValidationIssue[] {
  if (!data) return [];
  const out: ValidationIssue[] = [];
  const push = (raw: unknown, fallbackSeverity: string) => {
    if (!Array.isArray(raw)) return;
    for (const item of raw) {
      if (item && typeof item === "object") {
        const r = item as Record<string, unknown>;
        out.push({
          severity: s(r.severity) || fallbackSeverity,
          code: s(r.code),
          message: s(r.message) || s(r.description) || JSON.stringify(r),
          compound: s(r.compoundName) || s(r.rawCompoundName) || undefined,
        });
      } else if (typeof item === "string") {
        out.push({ severity: fallbackSeverity, code: "", message: item });
      }
    }
  };
  push(data.errors, "Error");
  push(data.warnings, "Warning");
  push(data.issues, "Info");
  push(data.messages, "Info");
  return out;
}

function issueTone(sev: string): "bad" | "warn" | "neutral" {
  const l = sev.toLowerCase();
  if (l.includes("error")) return "bad";
  if (l.includes("warn")) return "warn";
  return "neutral";
}

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { me } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const canDeleteRun = hasPermission(me, PERMS.runsDelete);
  const canResolve = hasPermission(me, PERMS.runsUpload);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const runData = (run.data ?? {}) as Record<string, unknown>;
  const instrumentId = s(runData.instrumentId);

  const instrumentQuery = useQuery({
    queryKey: ["instrument", instrumentId],
    queryFn: () => getInstrument(instrumentId),
    enabled: !!instrumentId,
  });
  const instrumentName = s((instrumentQuery.data as Record<string, unknown> | undefined)?.name);

  const analytesQuery = useQuery({
    queryKey: ["analytes", "picker"],
    queryFn: () => listAnalytes({ pageSize: 200, sort: "name:asc" }),
    enabled: canResolve,
  });
  const analyteOptions = useMemo(
    () => (analytesQuery.data?.items ?? []).map((r) => ({ id: s(r.id), name: s(r.name, s(r.id)) })),
    [analytesQuery.data],
  );

  const unresolvedRows = useMemo(() => {
    const rows = measurements.data ?? [];
    return rows.filter((r) => (r as Record<string, unknown>).isResolved === false);
  }, [measurements.data]);

  const unresolvedNames = useMemo(() => {
    const names = unresolvedRows
      .map((r) => s((r as Record<string, unknown>).rawCompoundName) || s((r as Record<string, unknown>).compoundName))
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [unresolvedRows]);

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
      toast.success("Compound mapped", `"${resolve.rawCompoundName}" is now resolved.`);
      setResolve((r) => ({ ...r, rawCompoundName: "", analyteId: "" }));
    },
    onError: (err: unknown) => {
      toast.error("Mapping failed", err instanceof Error ? err.message : undefined);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteRun(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["runs"] });
      toast.success("Run deleted");
      router.push("/runs");
    },
    onError: (err: unknown) => {
      toast.error("Delete failed", err instanceof Error ? err.message : undefined);
    },
  });

  const runTitle = s(runData.name).trim();
  const runType = typeof runData.runType === "number" ? runData.runType : 0;
  const status = typeof runData.status === "number" ? runData.status : 0;
  const issues = collectIssues(validation.data);

  return (
    <div className="space-y-6">
      <PageHeader
        title={runTitle || "Run"}
        description={
          run.isSuccess ? (
            <span className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{RUN_TYPE_LABEL[runType] ?? String(runType)}</Badge>
              <Badge tone={runStatusTone(status)}>{RUN_STATUS_LABEL[status] ?? String(status)}</Badge>
            </span>
          ) : (
            <span className="font-mono text-sm">{id}</span>
          )
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/runs">
              <Button variant="secondary" type="button">All runs</Button>
            </Link>
            {canResolve ? (
              <Link href={`/calibration-groups?instrumentId=${encodeURIComponent(instrumentId)}`}>
                <Button type="button">Add to calibration group</Button>
              </Link>
            ) : null}
          </div>
        }
      />

      <Card>
        <div className="text-sm font-medium">Run details</div>
        <div className="mt-3">
          {run.isLoading ? <SkeletonLines lines={5} /> : null}
          {run.isError ? <div className="text-sm text-red-600">{(run.error as Error).message}</div> : null}
          {run.isSuccess ? (
            <dl className="text-sm">
              <DetailRow label="Name">{runTitle || <span className="text-neutral-500">—</span>}</DetailRow>
              <DetailRow label="Type">{RUN_TYPE_LABEL[runType] ?? String(runType)}</DetailRow>
              <DetailRow label="Status">
                <Badge tone={runStatusTone(status)}>{RUN_STATUS_LABEL[status] ?? String(status)}</Badge>
              </DetailRow>
              <DetailRow label="Instrument">
                {instrumentId ? (
                  <Link className="text-blue-600 underline dark:text-blue-400" href={`/instruments/${instrumentId}`}>
                    {instrumentName || <span className="font-mono text-xs">{instrumentId}</span>}
                  </Link>
                ) : (
                  "—"
                )}
              </DetailRow>
              {s(runData.sampleName) ? <DetailRow label="Sample">{s(runData.sampleName)}</DetailRow> : null}
              {s(runData.dataFile) ? <DetailRow label="Data file">{s(runData.dataFile)}</DetailRow> : null}
              {s(runData.methodName) ? <DetailRow label="Method">{s(runData.methodName)}</DetailRow> : null}
              {s(runData.operator) ? <DetailRow label="Operator">{s(runData.operator)}</DetailRow> : null}
              <DetailRow label="Run date">{formatDate(s(runData.runDate) || s(runData.acquiredOn))}</DetailRow>
              {s(runData.createdAt) ? <DetailRow label="Uploaded">{formatDate(s(runData.createdAt))}</DetailRow> : null}
              {s(runData.textHash) ? (
                <DetailRow label="Text hash">
                  <span className="font-mono text-xs break-all">{s(runData.textHash)}</span>
                </DetailRow>
              ) : null}
              <DetailRow label="Run ID">
                <span className="font-mono text-xs break-all">{id}</span>
              </DetailRow>
            </dl>
          ) : null}
          {run.isSuccess ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                Raw response
              </summary>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-neutral-50 p-3 text-xs dark:bg-neutral-900">
                {JSON.stringify(run.data, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      </Card>

      <Card>
        <ExcelPageGuide pageKey="runs-detail" />
        <div className="text-sm font-medium">Measurements</div>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Parsed compound rows with instrument fields and IS-derived amount ratios (null when IS concentration is not
          configured on the default internal standard). Column headers show Cal/ICV Data and DVD row references.
        </p>
        {unresolvedRows.length > 0 ? (
          <Callout tone="warn" className="mt-3">
            {unresolvedRows.length} compound row(s) are not yet mapped to a canonical analyte. Resolve them below so this
            run can be used in a calibration group.
          </Callout>
        ) : null}
        <div className="mt-3">
          {measurements.isLoading ? <SkeletonLines lines={4} /> : null}
          {measurements.isError ? (
            <div className="text-sm text-red-600">{(measurements.error as Error).message}</div>
          ) : null}
          {measurements.isSuccess ? (
            <RunMeasurementsTable rows={(measurements.data ?? []) as Record<string, unknown>[]} />
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="text-sm font-medium">Validation</div>
        <ExcelAnnotation fieldKey="run.validationIssues" compact className="mt-2" />
        <div className="mt-3">
          {validation.isLoading ? <SkeletonLines lines={3} /> : null}
          {validation.isError ? (
            <div className="text-sm text-red-600">{(validation.error as Error).message}</div>
          ) : null}
          {validation.isSuccess && issues.length === 0 ? (
            <Callout tone="ok">No validation errors or warnings for this run.</Callout>
          ) : null}
          {issues.length > 0 ? (
            <ul className="space-y-2">
              {issues.map((iss, i) => (
                <li
                  key={`${iss.code}-${i}`}
                  className="flex items-start gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                >
                  <Badge tone={issueTone(iss.severity)}>{iss.severity}</Badge>
                  <div className="min-w-0">
                    <div className="text-sm">{iss.message}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-neutral-500">
                      {iss.code ? <span>Code: {iss.code}</span> : null}
                      {iss.compound ? <span>Compound: {iss.compound}</span> : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {validation.isSuccess ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                Raw response
              </summary>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-neutral-50 p-3 text-xs dark:bg-neutral-900">
                {JSON.stringify(validation.data, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      </Card>

      <InternalStandardSummariesPanel variant="run" resourceId={id} me={me} />

      {canResolve ? (
        <Card>
          <div className="text-sm font-medium">Resolve analyte mapping</div>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Map a raw instrument compound name onto a canonical analyte. Saving as an alias remaps every future run in
            your lab; otherwise the mapping applies to the chosen scope only.
          </p>
          <ExcelSectionHint sheet="Ref Table" location="F18+ Compound" note="Excel has fixed compound list — no alias layer" className="mt-2" />
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              resolveMut.mutate();
            }}
          >
            <div>
              <Label htmlFor="rawCompoundName">Raw compound name</Label>
              <ExcelAnnotation fieldKey="run.resolve.rawCompoundName" compact />
              {unresolvedNames.length > 0 ? (
                <Select
                  id="rawCompoundName"
                  className="mt-1"
                  value={resolve.rawCompoundName}
                  onChange={(e) => setResolve({ ...resolve, rawCompoundName: e.target.value })}
                  required
                >
                  <option value="">Select an unresolved compound…</option>
                  {unresolvedNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              ) : (
                <input
                  id="rawCompoundName"
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                  value={resolve.rawCompoundName}
                  onChange={(e) => setResolve({ ...resolve, rawCompoundName: e.target.value })}
                  placeholder="Exact name as printed on the instrument report"
                  required
                />
              )}
            </div>
            <div>
              <Label htmlFor="analyteId">Canonical analyte</Label>
              <ExcelAnnotation fieldKey="run.resolve.analyteId" compact />
              <Select
                id="analyteId"
                className="mt-1"
                value={resolve.analyteId}
                onChange={(e) => setResolve({ ...resolve, analyteId: e.target.value })}
                required
              >
                <option value="">Select analyte…</option>
                {analyteOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={resolve.saveAsAlias}
                  onChange={(e) => setResolve({ ...resolve, saveAsAlias: e.target.checked })}
                />
                Save as a lab-wide alias (remaps all future runs)
              </span>
              <ExcelAnnotation fieldKey="run.resolve.saveAsAlias" compact />
            </label>
            {!resolve.saveAsAlias ? (
              <div>
                <Label htmlFor="applyScope">Apply to</Label>
                <ExcelAnnotation fieldKey="run.resolve.applyScope" compact />
                <Select
                  id="applyScope"
                  className="mt-1"
                  value={String(resolve.applyScope)}
                  onChange={(e) => setResolve({ ...resolve, applyScope: Number(e.target.value) })}
                >
                  <option value={0}>This run only</option>
                  <option value={1}>Entire laboratory</option>
                </Select>
              </div>
            ) : null}
            <Button type="submit" disabled={resolveMut.isPending || !resolve.rawCompoundName || !resolve.analyteId}>
              {resolveMut.isPending ? "Resolving…" : "Resolve mapping"}
            </Button>
          </form>
        </Card>
      ) : null}

      {canDeleteRun ? (
        <Card>
          <div className="text-sm font-medium text-red-700 dark:text-red-400">Delete run</div>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Soft-deletes the run when it is not a member of any calibration group. If the run is still in a group, the
            server returns an error — remove it from the group first. Raw text is retained for audit.
          </p>
          <div className="mt-4">
            <Button variant="danger" disabled={deleteMut.isPending} onClick={() => setConfirmDelete(true)}>
              {deleteMut.isPending ? "Deleting…" : "Delete run"}
            </Button>
          </div>
        </Card>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          deleteMut.mutate();
        }}
        title="Delete this run?"
        message="It must not be linked to any calibration group. Soft-deleted runs are hidden from reads; raw text stays in the database for audit."
        confirmLabel="Delete run"
        danger
        busy={deleteMut.isPending}
      />
    </div>
  );
}
