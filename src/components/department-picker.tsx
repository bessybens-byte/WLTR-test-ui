"use client";

import { Select } from "@/components/ui";
import { listDepartments } from "@/lib/api/wltr-api";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

function s(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export type DepartmentOption = {
  id: string;
  name: string;
  isActive: boolean;
};

/**
 * Department selector populated from GET /api/departments (already scoped to the caller).
 * Use for filing work and pickers — never as an authorization gate.
 */
export function DepartmentPicker({
  id = "departmentId",
  value,
  onChange,
  required,
  disabled,
  /** When true, include inactive departments (for display/move away). Default: active only. */
  includeInactive = false,
  /** Extra first option (e.g. "Unassigned" with empty value). */
  emptyLabel,
  /** Platform operators may pass laboratoryId when filing under a tenant. */
  laboratoryId,
}: {
  id?: string;
  value: string;
  onChange: (departmentId: string) => void;
  required?: boolean;
  disabled?: boolean;
  includeInactive?: boolean;
  emptyLabel?: string;
  laboratoryId?: string;
}) {
  const q = useQuery({
    queryKey: ["departments", "picker", includeInactive ? "all" : "active", laboratoryId ?? ""],
    queryFn: () =>
      listDepartments({
        page: 1,
        pageSize: 100,
        sort: "name:asc",
        isActive: includeInactive ? undefined : true,
        laboratoryId: laboratoryId || undefined,
      }),
    enabled: !disabled,
  });

  const options: DepartmentOption[] = useMemo(
    () =>
      (q.data?.items ?? []).map((r) => ({
        id: s(r.id),
        name: s(r.name, s(r.id)),
        isActive: Boolean(r.isActive),
      })),
    [q.data],
  );

  return (
    <Select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={disabled || q.isLoading}
    >
      <option value="">
        {q.isLoading ? "Loading departments…" : (emptyLabel ?? "Select department…")}
      </option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
          {!o.isActive ? " (inactive)" : ""}
        </option>
      ))}
    </Select>
  );
}

/** Active department count for the caller's scope (create forms decide whether departmentId is required). */
export function useActiveDepartmentCount() {
  const q = useQuery({
    queryKey: ["departments", "picker", "active"],
    queryFn: () =>
      listDepartments({
        page: 1,
        pageSize: 100,
        sort: "name:asc",
        isActive: true,
      }),
  });
  const count = q.data?.items?.length ?? 0;
  return { count, isLoading: q.isLoading, isError: q.isError, items: q.data?.items ?? [] };
}
