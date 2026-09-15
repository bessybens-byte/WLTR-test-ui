"use client";

import { JsonPrettyView } from "@/components/json-pretty-view";
import { Badge, Button, Card, PageHeader, SkeletonLines } from "@/components/ui";
import { getMethodConfigSnapshot } from "@/lib/api/wltr-api";
import {
  METHOD_ANALYTE_CRITERIA_FIELD_DISPLAY,
  METHOD_CONFIG_FIELD_DISPLAY,
  type FieldDisplay,
} from "@/lib/method-config-field-help";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

function s(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function formatValue(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return String(v);
  return String(v);
}

function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

const GLOBAL_KEYS = Object.keys(METHOD_CONFIG_FIELD_DISPLAY).filter((k) => k !== "name");
const CRITERIA_KEYS = Object.keys(METHOD_ANALYTE_CRITERIA_FIELD_DISPLAY).filter((k) => k !== "analyte");

function findCriteriaArray(data: Record<string, unknown>): Record<string, unknown>[] {
  for (const key of ["analyteCriteria", "analyteCriterias", "analytes", "criteria"]) {
    const v = data[key];
    if (Array.isArray(v)) return v as Record<string, unknown>[];
  }
  return [];
}

export default function MethodConfigSnapshotDetailPage() {
  const { id, version } = useParams<{ id: string; version: string }>();
  const v = Number(version);
  const q = useQuery({
    queryKey: ["method-config-snapshot", id, v],
    queryFn: () => getMethodConfigSnapshot(id, v),
    enabled: !!id && Number.isFinite(v),
  });

  const data = (q.data ?? {}) as Record<string, unknown>;
  const criteria = findCriteriaArray(data);
  const schemaVersion = data.configSchemaVersion ?? data.schemaVersion;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Snapshot v${version}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>Frozen method thresholds used to grade a computation.</span>
            {schemaVersion != null ? <Badge tone="neutral">Schema v{String(schemaVersion)}</Badge> : null}
          </span>
        }
        actions={
          <Link href={`/method-configs/${id}/snapshots`}>
            <Button variant="secondary" type="button">All snapshots</Button>
          </Link>
        }
      />

      {q.isLoading ? (
        <Card>
          <SkeletonLines lines={6} />
        </Card>
      ) : null}
      {q.isError ? <div className="text-sm text-red-600">{(q.error as Error).message}</div> : null}

      {q.isSuccess ? (
        <>
          <Card>
            <div className="text-sm font-medium">Overview</div>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-4 border-b border-neutral-100 py-1.5 dark:border-neutral-900">
                <dt className="text-neutral-500">Version</dt>
                <dd className="font-mono">{formatValue(data.version ?? v)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-neutral-100 py-1.5 dark:border-neutral-900">
                <dt className="text-neutral-500">Created</dt>
                <dd>{formatDate(s(data.createdAt))}</dd>
              </div>
              {schemaVersion != null ? (
                <div className="flex justify-between gap-4 border-b border-neutral-100 py-1.5 dark:border-neutral-900">
                  <dt className="text-neutral-500">Config schema</dt>
                  <dd className="font-mono">v{String(schemaVersion)}</dd>
                </div>
              ) : null}
              {s(data.calibrationLevelSetId) ? (
                <div className="flex justify-between gap-4 border-b border-neutral-100 py-1.5 dark:border-neutral-900">
                  <dt className="text-neutral-500">Calibration level set</dt>
                  <dd className="font-mono text-xs">
                    <Link
                      className="text-blue-600 underline dark:text-blue-400"
                      href={`/calibration-level-sets/${s(data.calibrationLevelSetId)}`}
                    >
                      {s(data.calibrationLevelSetName) || s(data.calibrationLevelSetId).slice(0, 8) + "…"}
                    </Link>
                  </dd>
                </div>
              ) : null}
              {s(data.quantitationMode) ? (
                <div className="flex justify-between gap-4 border-b border-neutral-100 py-1.5 dark:border-neutral-900">
                  <dt className="text-neutral-500">Quantitation mode</dt>
                  <dd>{s(data.quantitationMode)}</dd>
                </div>
              ) : null}
            </dl>
          </Card>

          <Card>
            <div className="text-sm font-medium">Global thresholds</div>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {GLOBAL_KEYS.filter((k) => data[k] !== undefined).map((k) => {
                const display = METHOD_CONFIG_FIELD_DISPLAY[
                  k as keyof typeof METHOD_CONFIG_FIELD_DISPLAY
                ] as FieldDisplay;
                return (
                  <div
                    key={k}
                    className="flex items-center justify-between gap-4 border-b border-neutral-100 py-1.5 dark:border-neutral-900"
                  >
                    <dt className="text-neutral-500">
                      {display.text}
                      {display.abbrev ? <span className="ml-1 text-neutral-400">({display.abbrev})</span> : null}
                    </dt>
                    <dd className="font-mono">{formatValue(data[k])}</dd>
                  </div>
                );
              })}
            </dl>
          </Card>

          {criteria.length > 0 ? (
            <Card>
              <div className="text-sm font-medium">Per-analyte criteria ({criteria.length})</div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                      <th className="px-2 py-2 font-medium">Analyte</th>
                      {CRITERIA_KEYS.map((k) => {
                        const d = METHOD_ANALYTE_CRITERIA_FIELD_DISPLAY[
                          k as keyof typeof METHOD_ANALYTE_CRITERIA_FIELD_DISPLAY
                        ] as FieldDisplay;
                        return (
                          <th key={k} className="px-2 py-2 font-medium" title={d.text}>
                            {d.abbrev ?? d.text}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {criteria.map((row, i) => (
                      <tr
                        key={s(row.analyteId) || s(row.analyteName) || `row-${i}`}
                        className="border-b border-neutral-100 dark:border-neutral-900"
                      >
                        <td className="px-2 py-2">{s(row.analyteName) || s(row.analyteId) || "—"}</td>
                        {CRITERIA_KEYS.map((k) => (
                          <td key={k} className="px-2 py-2 font-mono">
                            {formatValue(row[k])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          <details>
            <summary className="cursor-pointer text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
              Full snapshot payload
            </summary>
            <div className="mt-3">
              <JsonPrettyView value={q.data} />
            </div>
          </details>
        </>
      ) : null}
    </div>
  );
}
