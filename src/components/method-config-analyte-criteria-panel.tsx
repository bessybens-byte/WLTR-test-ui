"use client";

import { ViewOnlyNotice } from "@/components/view-only-notice";
import { Button, Card, FieldHelp, FieldLabel, Input, LabelWithHelp, Select } from "@/components/ui";
import { listAnalytes, listMethodAnalyteCriteria, replaceMethodAnalyteCriteria } from "@/lib/api/wltr-api";
import {
  METHOD_ANALYTE_CRITERIA_FIELD_DISPLAY,
  METHOD_ANALYTE_CRITERIA_FIELD_HELP,
} from "@/lib/method-config-field-help";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

type CriteriaRow = {
  key: string;
  analyteId: string;
  isSpcc: boolean;
  minResponseFactor: string;
  isCcc: boolean;
  maxRsdPercent: string;
  methodBlankLimit: string;
  icvLcsConcentration: string;
  icvLcsLowerControlLimit: string;
  icvLcsUpperControlLimit: string;
  concentrationMultiplier: string;
  surrogateSpikeAmount: string;
  surrogateRecoveryLowerLimit: string;
  surrogateRecoveryUpperLimit: string;
};

function parseOptionalNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function rowFromApi(raw: Record<string, unknown>, key: string): CriteriaRow {
  return {
    key,
    analyteId: typeof raw.analyteId === "string" ? raw.analyteId : "",
    isSpcc: Boolean(raw.isSpcc),
    minResponseFactor: raw.minResponseFactor == null ? "" : String(raw.minResponseFactor),
    isCcc: Boolean(raw.isCcc),
    maxRsdPercent: raw.maxRsdPercent == null ? "" : String(raw.maxRsdPercent),
    methodBlankLimit: raw.methodBlankLimit == null ? "" : String(raw.methodBlankLimit),
    icvLcsConcentration: raw.icvLcsConcentration == null ? "" : String(raw.icvLcsConcentration),
    icvLcsLowerControlLimit: raw.icvLcsLowerControlLimit == null ? "" : String(raw.icvLcsLowerControlLimit),
    icvLcsUpperControlLimit: raw.icvLcsUpperControlLimit == null ? "" : String(raw.icvLcsUpperControlLimit),
    concentrationMultiplier:
      raw.concentrationMultiplier == null ? "1" : String(raw.concentrationMultiplier),
    surrogateSpikeAmount: raw.surrogateSpikeAmount == null ? "" : String(raw.surrogateSpikeAmount),
    surrogateRecoveryLowerLimit:
      raw.surrogateRecoveryLowerLimit == null ? "" : String(raw.surrogateRecoveryLowerLimit),
    surrogateRecoveryUpperLimit:
      raw.surrogateRecoveryUpperLimit == null ? "" : String(raw.surrogateRecoveryUpperLimit),
  };
}

function parsePositiveNum(s: string, defaultValue: number): number {
  const n = parseOptionalNum(s);
  return n != null && n > 0 ? n : defaultValue;
}

function rowToPayload(row: CriteriaRow) {
  return {
    analyteId: row.analyteId.trim(),
    isSpcc: row.isSpcc,
    minResponseFactor: parseOptionalNum(row.minResponseFactor),
    isCcc: row.isCcc,
    maxRsdPercent: parseOptionalNum(row.maxRsdPercent),
    methodBlankLimit: parseOptionalNum(row.methodBlankLimit),
    icvLcsConcentration: parseOptionalNum(row.icvLcsConcentration),
    icvLcsLowerControlLimit: parseOptionalNum(row.icvLcsLowerControlLimit),
    icvLcsUpperControlLimit: parseOptionalNum(row.icvLcsUpperControlLimit),
    concentrationMultiplier: parsePositiveNum(row.concentrationMultiplier, 1),
    surrogateSpikeAmount: parseOptionalNum(row.surrogateSpikeAmount),
    surrogateRecoveryLowerLimit: parseOptionalNum(row.surrogateRecoveryLowerLimit),
    surrogateRecoveryUpperLimit: parseOptionalNum(row.surrogateRecoveryUpperLimit),
  };
}

export function MethodConfigAnalyteCriteriaPanel({
  methodConfigId,
  canEdit,
}: {
  readonly methodConfigId: string;
  readonly canEdit: boolean;
}) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<CriteriaRow[]>([]);
  const [dirty, setDirty] = useState(false);

  const criteriaQuery = useQuery({
    queryKey: ["method-config-analyte-criteria", methodConfigId],
    queryFn: () => listMethodAnalyteCriteria(methodConfigId),
    enabled: Boolean(methodConfigId),
  });

  const analytesQuery = useQuery({
    queryKey: ["analytes", "picker-criteria"],
    queryFn: () => listAnalytes({ page: 1, pageSize: 100, sort: "name:asc" }),
    enabled: canEdit,
  });

  const analyteOptions = useMemo(() => {
    return (analytesQuery.data?.items ?? [])
      .map((item) => {
        const r = item as Record<string, unknown>;
        const id = typeof r.id === "string" ? r.id : "";
        if (!id) return null;
        return { id, name: typeof r.name === "string" ? r.name : id };
      })
      .filter((o): o is { id: string; name: string } => o !== null);
  }, [analytesQuery.data]);

  useEffect(() => {
    if (!criteriaQuery.data || dirty) return;
    const parsed = (criteriaQuery.data ?? []).map((raw, i) =>
      rowFromApi(raw as Record<string, unknown>, `loaded-${i}`),
    );
    setRows(parsed);
  }, [criteriaQuery.data, dirty]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = rows
        .filter((r) => r.analyteId.trim())
        .map(rowToPayload);
      await replaceMethodAnalyteCriteria(methodConfigId, { rows: payload });
    },
    onSuccess: async () => {
      setDirty(false);
      await qc.invalidateQueries({ queryKey: ["method-config-analyte-criteria", methodConfigId] });
    },
  });

  function updateRow(key: string, patch: Partial<CriteriaRow>) {
    setDirty(true);
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setDirty(true);
    setRows((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}`,
        analyteId: "",
        isSpcc: false,
        minResponseFactor: "",
        isCcc: false,
        maxRsdPercent: "",
        methodBlankLimit: "",
        icvLcsConcentration: "",
        icvLcsLowerControlLimit: "",
        icvLcsUpperControlLimit: "",
        concentrationMultiplier: "1",
        surrogateSpikeAmount: "",
        surrogateRecoveryLowerLimit: "",
        surrogateRecoveryUpperLimit: "",
      },
    ]);
  }

  function removeRow(key: string) {
    setDirty(true);
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  const h = METHOD_ANALYTE_CRITERIA_FIELD_HELP;
  const d = METHOD_ANALYTE_CRITERIA_FIELD_DISPLAY;

  return (
    <Card>
      <div className="text-sm font-medium">Per-analyte acceptance criteria</div>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
        Per-analyte limits for SPCC, CCC, method blanks (MB), and ICV/LCS recovery (LCL/UCL). Frozen into the method
        snapshot at each config save and used at compute time.
      </p>

      {criteriaQuery.isLoading ? <div className="mt-3 text-sm">Loading criteria…</div> : null}
      {criteriaQuery.isError ? (
        <div className="mt-3 text-sm text-red-600">{(criteriaQuery.error as Error).message}</div>
      ) : null}

      {criteriaQuery.isSuccess ? (
        <div className="mt-4 space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-neutral-500">No per-analyte criteria configured.</p>
          ) : (
            <div className="space-y-4">
              {rows.map((row) => {
                const analyteName =
                  analyteOptions.find((a) => a.id === row.analyteId)?.name ??
                  (typeof (criteriaQuery.data ?? []).find(
                    (r) => (r as Record<string, unknown>).analyteId === row.analyteId,
                  ) === "object"
                    ? String(
                        (
                          (criteriaQuery.data ?? []).find(
                            (r) => (r as Record<string, unknown>).analyteId === row.analyteId,
                          ) as Record<string, unknown>
                        )?.analyteName ?? "",
                      )
                    : "");
                return (
                  <div
                    key={row.key}
                    className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                  >
                    <div className="mb-3 flex flex-wrap items-end gap-3">
                      <div className="min-w-[200px] flex-1">
                        <LabelWithHelp help={h.analyte}>
                          <FieldLabel {...d.analyte} />
                        </LabelWithHelp>
                        {canEdit ? (
                          <Select
                            className="mt-1"
                            value={row.analyteId}
                            onChange={(e) => updateRow(row.key, { analyteId: e.target.value })}
                          >
                            <option value="">Select analyte…</option>
                            {analyteOptions.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <div className="mt-1 text-sm">{analyteName || row.analyteId || "—"}</div>
                        )}
                      </div>
                      {canEdit ? (
                        <Button type="button" variant="danger" className="text-xs" onClick={() => removeRow(row.key)}>
                          Remove
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="flex items-end gap-2">
                        <label className="flex items-center gap-2 pb-2 text-xs">
                          <input
                            type="checkbox"
                            checked={row.isSpcc}
                            disabled={!canEdit}
                            onChange={(e) => updateRow(row.key, { isSpcc: e.target.checked })}
                          />
                          <FieldLabel {...d.isSpcc} />
                          <FieldHelp help={h.isSpcc} />
                        </label>
                      </div>
                      <div>
                        <LabelWithHelp className="text-xs" help={h.minResponseFactor}>
                          <FieldLabel {...d.minResponseFactor} />
                        </LabelWithHelp>
                        <Input
                          type="number"
                          step="any"
                          className="mt-1"
                          value={row.minResponseFactor}
                          disabled={!canEdit || !row.isSpcc}
                          onChange={(e) => updateRow(row.key, { minResponseFactor: e.target.value })}
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <label className="flex items-center gap-2 pb-2 text-xs">
                          <input
                            type="checkbox"
                            checked={row.isCcc}
                            disabled={!canEdit}
                            onChange={(e) => updateRow(row.key, { isCcc: e.target.checked })}
                          />
                          <FieldLabel {...d.isCcc} />
                          <FieldHelp help={h.isCcc} />
                        </label>
                      </div>
                      <div>
                        <LabelWithHelp className="text-xs" help={h.maxRsdPercent}>
                          <FieldLabel {...d.maxRsdPercent} />
                        </LabelWithHelp>
                        <Input
                          type="number"
                          step="any"
                          className="mt-1"
                          value={row.maxRsdPercent}
                          disabled={!canEdit || !row.isCcc}
                          onChange={(e) => updateRow(row.key, { maxRsdPercent: e.target.value })}
                        />
                      </div>
                      <div>
                        <LabelWithHelp className="text-xs" help={h.methodBlankLimit}>
                          <FieldLabel {...d.methodBlankLimit} />
                        </LabelWithHelp>
                        <Input
                          type="number"
                          step="any"
                          className="mt-1"
                          value={row.methodBlankLimit}
                          disabled={!canEdit}
                          onChange={(e) => updateRow(row.key, { methodBlankLimit: e.target.value })}
                        />
                      </div>
                      <div>
                        <LabelWithHelp className="text-xs" help={h.icvLcsConcentration}>
                          <FieldLabel {...d.icvLcsConcentration} />
                        </LabelWithHelp>
                        <Input
                          type="number"
                          step="any"
                          className="mt-1"
                          value={row.icvLcsConcentration}
                          disabled={!canEdit}
                          onChange={(e) => updateRow(row.key, { icvLcsConcentration: e.target.value })}
                        />
                      </div>
                      <div>
                        <LabelWithHelp className="text-xs" help={h.icvLcsLowerControlLimit}>
                          <FieldLabel {...d.icvLcsLowerControlLimit} />
                        </LabelWithHelp>
                        <Input
                          type="number"
                          step="any"
                          className="mt-1"
                          value={row.icvLcsLowerControlLimit}
                          disabled={!canEdit}
                          onChange={(e) => updateRow(row.key, { icvLcsLowerControlLimit: e.target.value })}
                        />
                      </div>
                      <div>
                        <LabelWithHelp className="text-xs" help={h.icvLcsUpperControlLimit}>
                          <FieldLabel {...d.icvLcsUpperControlLimit} />
                        </LabelWithHelp>
                        <Input
                          type="number"
                          step="any"
                          className="mt-1"
                          value={row.icvLcsUpperControlLimit}
                          disabled={!canEdit}
                          onChange={(e) => updateRow(row.key, { icvLcsUpperControlLimit: e.target.value })}
                        />
                      </div>
                      <div>
                        <LabelWithHelp className="text-xs" help={h.concentrationMultiplier}>
                          <FieldLabel {...d.concentrationMultiplier} />
                        </LabelWithHelp>
                        <Input
                          type="number"
                          step="any"
                          className="mt-1"
                          value={row.concentrationMultiplier}
                          disabled={!canEdit}
                          placeholder="> 0 (default 1)"
                          onChange={(e) => updateRow(row.key, { concentrationMultiplier: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 rounded-lg border border-neutral-100 bg-neutral-50/60 p-3 dark:border-neutral-800 dark:bg-neutral-900/30 sm:grid-cols-3">
                      <div className="sm:col-span-3">
                        <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          Surrogate / SMC recovery
                          <span className="ml-1 font-normal text-neutral-500 dark:text-neutral-400">
                            (optional)
                          </span>
                        </p>
                      </div>
                      <div>
                        <LabelWithHelp className="text-xs" help={h.surrogateSpikeAmount}>
                          <FieldLabel {...d.surrogateSpikeAmount} />
                        </LabelWithHelp>
                        <Input
                          type="number"
                          step="any"
                          className="mt-1"
                          value={row.surrogateSpikeAmount}
                          disabled={!canEdit}
                          placeholder="Optional, > 0"
                          onChange={(e) => updateRow(row.key, { surrogateSpikeAmount: e.target.value })}
                        />
                      </div>
                      <div>
                        <LabelWithHelp className="text-xs" help={h.surrogateRecoveryLowerLimit}>
                          <FieldLabel {...d.surrogateRecoveryLowerLimit} />
                        </LabelWithHelp>
                        <Input
                          type="number"
                          step="any"
                          className="mt-1"
                          value={row.surrogateRecoveryLowerLimit}
                          disabled={!canEdit}
                          placeholder="Optional, ≥ 0"
                          onChange={(e) =>
                            updateRow(row.key, { surrogateRecoveryLowerLimit: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <LabelWithHelp className="text-xs" help={h.surrogateRecoveryUpperLimit}>
                          <FieldLabel {...d.surrogateRecoveryUpperLimit} />
                        </LabelWithHelp>
                        <Input
                          type="number"
                          step="any"
                          className="mt-1"
                          value={row.surrogateRecoveryUpperLimit}
                          disabled={!canEdit}
                          placeholder="Optional, > lower limit"
                          onChange={(e) =>
                            updateRow(row.key, { surrogateRecoveryUpperLimit: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {save.isError ? <div className="text-sm text-red-600">{(save.error as Error).message}</div> : null}

          {canEdit ? (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={addRow}>
                Add analyte row
              </Button>
              <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? "Saving…" : "Save criteria"}
              </Button>
            </div>
          ) : (
            <ViewOnlyNotice />
          )}
        </div>
      ) : null}
    </Card>
  );
}
