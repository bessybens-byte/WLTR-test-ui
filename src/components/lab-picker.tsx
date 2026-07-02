"use client";

import { Button, Input, Select } from "@/components/ui";
import { listLaboratories } from "@/lib/api/wltr-api";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

const LAST_LAB_KEY = "wltr:lastLabId";

/** Reads the last laboratory a platform operator worked in (this session). */
export function getRememberedLabId(): string {
  try {
    return sessionStorage.getItem(LAST_LAB_KEY) ?? "";
  } catch {
    return "";
  }
}

function rememberLabId(id: string) {
  try {
    if (id) sessionStorage.setItem(LAST_LAB_KEY, id);
  } catch {
    // ignore
  }
}

function s(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

/**
 * Laboratory selector for platform operators (accounts with no JWT lab claim).
 * Populated from the laboratories directory, with a manual-UUID fallback, and
 * remembers the last selection for the session.
 */
export function LabPicker({
  id = "laboratoryId",
  value,
  onChange,
  required,
}: {
  id?: string;
  value: string;
  onChange: (labId: string) => void;
  required?: boolean;
}) {
  const [manual, setManual] = useState(false);

  const labsQuery = useQuery({
    queryKey: ["laboratories", "picker"],
    queryFn: () => listLaboratories({ pageSize: 200, sort: "name:asc" }),
  });

  const options = useMemo(
    () => (labsQuery.data?.items ?? []).map((r) => ({ id: s(r.id), name: s(r.name, s(r.id)) })),
    [labsQuery.data],
  );

  const set = (labId: string) => {
    rememberLabId(labId);
    onChange(labId);
  };

  const useManual = manual || (labsQuery.isError && options.length === 0);

  return (
    <div className="space-y-2">
      {useManual ? (
        <Input
          id={id}
          value={value}
          onChange={(e) => set(e.target.value)}
          placeholder="Laboratory UUID"
          className="font-mono text-xs"
          required={required}
        />
      ) : (
        <Select
          id={id}
          value={value}
          onChange={(e) => set(e.target.value)}
          required={required}
          disabled={labsQuery.isLoading}
        >
          <option value="">{labsQuery.isLoading ? "Loading laboratories…" : "Select laboratory…"}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
      )}
      {!labsQuery.isError ? (
        <Button
          type="button"
          variant="ghost"
          className="!px-1 !py-0 !text-xs text-neutral-500"
          onClick={() => setManual((m) => !m)}
        >
          {useManual ? "Pick from list" : "Enter ID manually"}
        </Button>
      ) : null}
    </div>
  );
}
