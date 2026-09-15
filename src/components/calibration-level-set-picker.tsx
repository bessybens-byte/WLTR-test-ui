"use client";

import { Select } from "@/components/ui";
import { listCalibrationLevelSets } from "@/lib/api/wltr-api";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

function s(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export type CalibrationLevelSetOption = {
  id: string;
  name: string;
  departmentId: string;
  isActive: boolean;
};

/**
 * Calibration-level-set selector populated from GET /api/calibration-level-sets (already scoped to the caller).
 * Optionally narrows to one department by filtering client-side — the list endpoint has no department query.
 * Use for filing work and pickers — never as an authorization gate.
 */
export function CalibrationLevelSetPicker({
  id = "calibrationLevelSetId",
  value,
  onChange,
  required,
  disabled,
  /** Narrow to sets owned by this department (client-side filter). */
  departmentId,
  /** When true, include retired sets (for display/move away). Default: active only. */
  includeInactive = false,
  /** Extra first option (e.g. "None" with empty value). */
  emptyLabel,
}: {
  id?: string;
  value: string;
  onChange: (calibrationLevelSetId: string) => void;
  required?: boolean;
  disabled?: boolean;
  departmentId?: string;
  includeInactive?: boolean;
  emptyLabel?: string;
}) {
  const q = useQuery({
    queryKey: [
      "calibration-level-sets",
      "picker",
      includeInactive ? "all" : "active",
      departmentId ?? "",
    ],
    queryFn: () =>
      listCalibrationLevelSets({
        page: 1,
        pageSize: 200,
        sort: "name:asc",
      }),
    enabled: !disabled,
  });

  const options: CalibrationLevelSetOption[] = useMemo(() => {
    const rows = (q.data?.items ?? []).map((r) => ({
      id: s(r.id),
      name: s(r.name, s(r.id)),
      departmentId: s(r.departmentId),
      isActive: Boolean(r.isActive),
    }));
    const inDepartment = departmentId
      ? rows.filter((o) => o.departmentId === departmentId)
      : rows;
    const byActive = includeInactive ? inDepartment : inDepartment.filter((o) => o.isActive);
    return byActive;
  }, [q.data, departmentId, includeInactive]);

  return (
    <Select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={disabled || q.isLoading}
    >
      <option value="">
        {q.isLoading ? "Loading level sets…" : (emptyLabel ?? "Select calibration level set…")}
      </option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
          {!o.isActive ? " (retired)" : ""}
        </option>
      ))}
    </Select>
  );
}
