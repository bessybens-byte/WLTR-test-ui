"use client";

import { Label, Select } from "@/components/ui";
import { listInternalStandards } from "@/lib/api/wltr-api";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export type AnalyteInternalStandardSelectProps = {
  value: string;
  onChange: (internalStandardId: string) => void;
  disabled?: boolean;
  id?: string;
  label?: string;
};

/**
 * Dropdown of internal standards from `GET /api/internal-standards` for `defaultInternalStandardId`.
 */
export function AnalyteInternalStandardSelect({
  value,
  onChange,
  disabled,
  id = "defaultInternalStandardId",
  label = "Default internal standard",
}: AnalyteInternalStandardSelectProps) {
  const q = useQuery({
    queryKey: ["internal-standards", "picker"],
    queryFn: () => listInternalStandards(),
  });

  const items = useMemo(() => {
    const raw = Array.isArray(q.data) ? q.data : [];
    return raw.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id ?? ""),
        name: String(r.name ?? "").trim() || String(r.id ?? ""),
      };
    });
  }, [q.data]);

  const orphan = Boolean(value && !items.some((x) => x.id === value));

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {q.isLoading ? (
        <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Loading internal standards…</div>
      ) : null}
      {q.isError ? (
        <div className="mt-1 text-sm text-red-600">{(q.error as Error).message}</div>
      ) : null}
      {q.isSuccess ? (
        <>
          <Select
            id={id}
            className="mt-1"
            disabled={disabled}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">None (no default IS)</option>
            {orphan ? (
              <option value={value}>Keep current (not in catalog): {value}</option>
            ) : null}
            {items.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          {orphan ? (
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
              This id is not in the internal-standards catalog. Pick a standard above or choose “None”.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
