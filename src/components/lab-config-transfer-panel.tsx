"use client";

import { LabPicker, getRememberedLabId } from "@/components/lab-picker";
import { ConfirmDialog } from "@/components/modal";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { Badge, Button, Callout, Card, Input, Label, Select } from "@/components/ui";
import { ApiError } from "@/lib/api/errors";
import { downloadLabConfigExport, importLabConfig, listMethodConfigs } from "@/lib/api/wltr-api";
import {
  LAB_CONFIG_BUNDLE_DESCRIPTION,
  LAB_CONFIG_BUNDLE_LABEL,
  LAB_CONFIG_IMPORT_STRATEGY_LABEL,
  type LabConfigBundle,
  type LabConfigImportResult,
  type LabConfigImportRowError,
  type LabConfigImportStrategy,
  type MeResponse,
} from "@/lib/types/wltr";
import { useToast } from "@/providers/toast-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

const BUNDLES = Object.keys(LAB_CONFIG_BUNDLE_LABEL) as LabConfigBundle[];
const STRATEGIES = Object.keys(LAB_CONFIG_IMPORT_STRATEGY_LABEL) as LabConfigImportStrategy[];

function groupErrorsBySheet(errors: LabConfigImportRowError[]): Map<string, LabConfigImportRowError[]> {
  const map = new Map<string, LabConfigImportRowError[]>();
  for (const err of errors) {
    const sheet = err.sheet?.trim() || "Unknown sheet";
    const list = map.get(sheet) ?? [];
    list.push(err);
    map.set(sheet, list);
  }
  return map;
}

function formatRowRef(err: LabConfigImportRowError): string {
  const parts: string[] = [];
  if (err.row != null) parts.push(`row ${err.row}`);
  if (err.column?.trim()) parts.push(`column ${err.column.trim()}`);
  return parts.length ? parts.join(", ") : "row";
}

function ImportPreview({ result }: { result: LabConfigImportResult }) {
  const errors = result.errors ?? [];
  const grouped = useMemo(() => groupErrorsBySheet(errors), [errors]);
  const hasCounts =
    result.created != null ||
    result.updated != null ||
    result.skipped != null ||
    result.failed != null;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {result.dryRun ? <Badge tone="warn">Preview only</Badge> : null}
        {result.success ? <Badge tone="ok">Valid</Badge> : <Badge tone="bad">Has errors</Badge>}
      </div>

      {hasCounts ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-neutral-500">Created</dt>
            <dd className="font-medium tabular-nums">{result.created ?? 0}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Updated</dt>
            <dd className="font-medium tabular-nums">{result.updated ?? 0}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Skipped</dt>
            <dd className="font-medium tabular-nums">{result.skipped ?? 0}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Failed</dt>
            <dd className="font-medium tabular-nums">{result.failed ?? 0}</dd>
          </div>
        </dl>
      ) : null}

      {errors.length > 0 ? (
        <div className="space-y-3">
          {[...grouped.entries()].map(([sheet, sheetErrors]) => (
            <div key={sheet}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{sheet}</div>
              <ul className="mt-1 space-y-1 text-sm text-red-700 dark:text-red-300">
                {sheetErrors.map((err, i) => (
                  <li key={`${sheet}:${err.row}:${err.column}:${i}`}>
                    <span className="font-mono text-xs">{formatRowRef(err)}</span>
                    {err.message ? `: ${err.message}` : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : result.success ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          No row errors. You can commit this import when ready.
        </p>
      ) : null}
    </div>
  );
}

export function LabConfigTransferPanel({
  me,
  canEdit,
}: {
  me: MeResponse | null | undefined;
  canEdit: boolean;
}) {
  const toast = useToast();
  const qc = useQueryClient();

  const labInJwt = me?.laboratoryId;
  const needPlatformLab = !labInJwt;

  const [laboratoryId, setLaboratoryId] = useState(getRememberedLabId);
  const effectiveLaboratoryId = labInJwt || laboratoryId.trim() || undefined;

  const [bundle, setBundle] = useState<LabConfigBundle>("reference-catalog");
  const [methodConfigId, setMethodConfigId] = useState("");
  const [includeInlineCatalog, setIncludeInlineCatalog] = useState(false);
  const [includeRoles, setIncludeRoles] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [strategy, setStrategy] = useState<LabConfigImportStrategy>("skip");
  const [preview, setPreview] = useState<LabConfigImportResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const methodConfigsQuery = useQuery({
    queryKey: ["method-configs", "picker", effectiveLaboratoryId],
    queryFn: () => listMethodConfigs({ pageSize: 200, sort: "name:asc" }),
    enabled: bundle === "method-ruleset" && !needPlatformLab,
  });

  function onLaboratoryChange(labId: string) {
    setLaboratoryId(labId);
    setPreview(null);
    setConfirmOpen(false);
  }

  const exportMut = useMutation({
    mutationFn: async () => {
      await downloadLabConfigExport({
        bundle,
        laboratoryId: effectiveLaboratoryId,
        methodConfigId: bundle === "method-ruleset" && methodConfigId.trim() ? methodConfigId.trim() : undefined,
        includeInlineCatalog:
          bundle === "method-ruleset" || bundle === "instrument-setup" ? includeInlineCatalog : undefined,
        includeRoles: bundle === "lab-config-package" ? includeRoles : undefined,
      });
    },
    onSuccess: () => toast.success("Export downloaded"),
    onError: (e) => toast.error("Export failed", (e as Error).message),
  });

  const previewMut = useMutation({
    mutationFn: async () => {
      if (!importFile) throw new Error("Choose a workbook first.");
      return importLabConfig(importFile, {
        strategy,
        dryRun: true,
        laboratoryId: effectiveLaboratoryId,
      });
    },
    onSuccess: (result) => {
      setPreview(result);
      if (result.success) {
        toast.success("Preview ready", "No row errors found.");
      } else {
        toast.warn("Preview has errors", "Fix the workbook or adjust your strategy.");
      }
    },
    onError: (e) => {
      setPreview(null);
      toast.error("Preview failed", (e as Error).message);
    },
  });

  const commitMut = useMutation({
    mutationFn: async () => {
      if (!importFile) throw new Error("Choose a workbook first.");
      return importLabConfig(importFile, {
        strategy,
        dryRun: false,
        laboratoryId: effectiveLaboratoryId,
      });
    },
    onSuccess: (result) => {
      setPreview(result);
      setConfirmOpen(false);
      if (result.success) {
        toast.success("Import complete", `${result.created ?? 0} created, ${result.updated ?? 0} updated`);
        void qc.invalidateQueries({ queryKey: ["analytes"] });
        void qc.invalidateQueries({ queryKey: ["internal-standards"] });
        void qc.invalidateQueries({ queryKey: ["calibration-levels"] });
        void qc.invalidateQueries({ queryKey: ["instruments"] });
        void qc.invalidateQueries({ queryKey: ["method-configs"] });
        void qc.invalidateQueries({ queryKey: ["roles"] });
        setImportFile(null);
        setFileInputKey((k) => k + 1);
      } else {
        toast.error("Import failed", "Row errors prevented the import.");
      }
    },
    onError: (e) => {
      setConfirmOpen(false);
      const msg = e instanceof ApiError && e.status === 409 ? "A conflicting edit is in progress. Try again." : (e as Error).message;
      toast.error("Import failed", msg);
    },
  });

  const labReady = !needPlatformLab || !!laboratoryId.trim();
  const exportDisabled = !labReady || exportMut.isPending;
  const importDisabled = !labReady || !importFile || previewMut.isPending || commitMut.isPending;

  const canCommit = preview?.success === true && preview.dryRun === true && !!importFile;

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImportFile(file);
    setPreview(null);
  }

  return (
    <div className="space-y-6">
      {needPlatformLab ? (
        <Card>
          <Label htmlFor="labConfigLab">Laboratory</Label>
          <p className="mb-2 text-xs text-neutral-600 dark:text-neutral-400">
            Required for platform operators — export and import are scoped to this laboratory.
          </p>
          <LabPicker id="labConfigLab" value={laboratoryId} onChange={onLaboratoryChange} required />
        </Card>
      ) : (
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          Scoped to your laboratory from the access token.
        </p>
      )}

      <Card>
        <div className="text-sm font-medium">Export workbook</div>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Download lab configuration as an Excel file. Requires view access.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="exportBundle">Bundle</Label>
            <Select
              id="exportBundle"
              value={bundle}
              onChange={(e) => setBundle(e.target.value as LabConfigBundle)}
              className="mt-1"
            >
              {BUNDLES.map((b) => (
                <option key={b} value={b}>
                  {LAB_CONFIG_BUNDLE_LABEL[b]}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-neutral-500">{LAB_CONFIG_BUNDLE_DESCRIPTION[bundle]}</p>
          </div>

          {bundle === "method-ruleset" ? (
            <div>
              <Label htmlFor="exportMethodConfig">Method config (optional)</Label>
              {methodConfigsQuery.isSuccess && (methodConfigsQuery.data.items?.length ?? 0) > 0 ? (
                <Select
                  id="exportMethodConfig"
                  value={methodConfigId}
                  onChange={(e) => setMethodConfigId(e.target.value)}
                  className="mt-1"
                >
                  <option value="">All method configs</option>
                  {methodConfigsQuery.data.items!.map((row) => {
                    const r = row as Record<string, unknown>;
                    const id = String(r.id ?? "");
                    return (
                      <option key={id} value={id}>
                        {String(r.name ?? id)}
                      </option>
                    );
                  })}
                </Select>
              ) : (
                <>
                  <Input
                    id="exportMethodConfig"
                    value={methodConfigId}
                    onChange={(e) => setMethodConfigId(e.target.value)}
                    placeholder="Method config UUID (omit for all)"
                    className="mt-1 font-mono text-xs"
                  />
                  {needPlatformLab ? (
                    <p className="mt-1 text-xs text-neutral-500">
                      Platform operators must enter a method config UUID — the list API is scoped to JWT lab claims.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {bundle === "method-ruleset" || bundle === "instrument-setup" ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={includeInlineCatalog}
                onChange={(e) => setIncludeInlineCatalog(e.target.checked)}
              />
              <span>
                Include inline reference catalog
                <span className="mt-0.5 block text-xs text-neutral-500">
                  Embeds analytes, internal standards, and calibration levels in the same file.
                </span>
              </span>
            </label>
          ) : null}

          {bundle === "lab-config-package" ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={includeRoles}
                onChange={(e) => setIncludeRoles(e.target.checked)}
              />
              <span>
                Include custom roles
                <span className="mt-0.5 block text-xs text-neutral-500">
                  Exports lab-specific role definitions when present.
                </span>
              </span>
            </label>
          ) : null}

          <Button type="button" disabled={exportDisabled} onClick={() => exportMut.mutate()}>
            {exportMut.isPending ? "Exporting…" : "Download Excel"}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-medium">Import workbook</div>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Upload an Excel workbook to create or update configuration rows. Import never deletes rows missing
          from the file.
        </p>

        {!canEdit ? (
          <div className="mt-4">
            <ViewOnlyNotice />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="importFile">Workbook (.xlsx)</Label>
              <Input
                key={fileInputKey}
                id="importFile"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="mt-1"
                onChange={onFileChange}
              />
              {importFile ? (
                <p className="mt-1 text-xs text-neutral-500">
                  Selected: {importFile.name} ({Math.round(importFile.size / 1024)} KB)
                </p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="importStrategy">Conflict strategy</Label>
              <Select
                id="importStrategy"
                value={strategy}
                onChange={(e) => {
                  setStrategy(e.target.value as LabConfigImportStrategy);
                  setPreview(null);
                }}
                className="mt-1"
              >
                {STRATEGIES.map((s) => (
                  <option key={s} value={s}>
                    {LAB_CONFIG_IMPORT_STRATEGY_LABEL[s]}
                  </option>
                ))}
              </Select>
              {strategy === "fail" ? (
                <Callout tone="warn" className="mt-2">
                  Fail aborts the entire import on the first conflicting row — nothing is written.
                </Callout>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={importDisabled}
                onClick={() => previewMut.mutate()}
              >
                {previewMut.isPending ? "Previewing…" : "Preview import"}
              </Button>
              <Button
                type="button"
                disabled={!canCommit || commitMut.isPending}
                onClick={() => setConfirmOpen(true)}
              >
                Commit import
              </Button>
            </div>

            {preview ? <ImportPreview result={preview} /> : null}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => commitMut.mutate()}
        title="Commit import?"
        message={
          <>
            This will write <strong>{preview?.created ?? 0}</strong> new and{" "}
            <strong>{preview?.updated ?? 0}</strong> updated rows using the{" "}
            <strong>{LAB_CONFIG_IMPORT_STRATEGY_LABEL[strategy]}</strong> strategy. This cannot be undone
            automatically.
          </>
        }
        confirmLabel="Commit import"
        busy={commitMut.isPending}
      />
    </div>
  );
}
