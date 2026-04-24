"use client";

import { Badge, Button, Card, Input, Label, PageHeader, Select } from "@/components/ui";
import {
  createCalibrationGroup,
  getCalibrationGroupCandidates,
  listCalibrationGroups,
  listInstruments,
  listMethodConfigs,
} from "@/lib/api/wltr-api";
import { GROUP_STATUS_LABEL, hasPermission, PERMS } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function s(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

type CandidateRun = {
  id: string;
  runDate: string;
  name: string | null;
  calibrationLevelId: string | null;
  isEligibleAsCal: boolean;
  isEligibleAsIcv: boolean;
  ineligibilityReason: string | null;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "short" });
  } catch {
    return iso;
  }
}

function groupStatusTone(status: number): "ok" | "warn" | "bad" | "neutral" {
  if (status === 2) return "ok";
  if (status === 3) return "bad";
  return "neutral";
}

function mapCandidate(r: Record<string, unknown>): CandidateRun {
  const nm = typeof r.name === "string" ? r.name.trim() : "";
  return {
    id: s(r.id),
    runDate: s(r.runDate),
    name: nm ? nm : null,
    calibrationLevelId: typeof r.calibrationLevelId === "string" ? r.calibrationLevelId : null,
    isEligibleAsCal: Boolean(r.isEligibleAsCal),
    isEligibleAsIcv: Boolean(r.isEligibleAsIcv),
    ineligibilityReason: typeof r.ineligibilityReason === "string" ? r.ineligibilityReason : null,
  };
}

type CalRunsContentProps = Readonly<{
  instrumentSelected: boolean;
  isLoading: boolean;
  isError: boolean;
  candidates: readonly CandidateRun[];
  selectedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
}>;

function CalRunsContent({ instrumentSelected, isLoading, isError, candidates, selectedIds, onToggle }: CalRunsContentProps) {
  if (!instrumentSelected) return <p className="text-sm text-neutral-500">Select an instrument to load eligible CAL runs.</p>;
  if (isLoading) return <p className="text-sm text-neutral-500">Loading candidates…</p>;
  if (isError) return <p className="text-sm text-red-600">Failed to load candidates.</p>;
  if (candidates.length === 0) return <p className="text-sm text-neutral-500">No CAL runs found for this instrument.</p>;
  return (
    <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
      {candidates.map((r) => {
        const calReason = r.isEligibleAsCal ? null : r.ineligibilityReason;
        const rowClass = `flex cursor-pointer items-start gap-2 text-xs${r.isEligibleAsCal ? "" : " opacity-50"}`;
        return (
          <li key={r.id}>
            <label className={rowClass}>
              <input
                type="checkbox"
                className="mt-0.5"
                disabled={r.isEligibleAsCal ? undefined : true}
                checked={selectedIds.has(r.id)}
                onChange={() => onToggle(r.id)}
              />
              <span className="flex-1">
                {r.name ? (
                  <>
                    <span className="font-medium">{r.name}</span>
                    {" · "}
                    <span className="font-mono text-neutral-600 dark:text-neutral-400">{r.id.slice(0, 8)}…</span>
                  </>
                ) : (
                  <span className="font-mono">{r.id.slice(0, 8)}…</span>
                )}
                {" · "}
                <span>{formatDate(r.runDate)}</span>
                {r.calibrationLevelId ? (
                  <span className="ml-1 text-neutral-500">level: {r.calibrationLevelId.slice(0, 8)}…</span>
                ) : null}
                {calReason ? (
                  <span className="ml-1 text-amber-700 dark:text-amber-400">— {calReason}</span>
                ) : null}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export default function CalibrationGroupsPage() {
  const router = useRouter();
  const { me } = useAuth();
  const canCreate = hasPermission(me, PERMS.runsUpload);

  const [openId, setOpenId] = useState("");
  const [groupsPage, setGroupsPage] = useState(1);

  /* ── Groups list ── */
  const groupsQuery = useQuery({
    queryKey: ["calibration-groups", "list", groupsPage],
    queryFn: () => listCalibrationGroups({ page: groupsPage, pageSize: 25, sort: "createdAt:desc" }),
  });

  const groups = (groupsQuery.data?.items ?? []).map((r) => ({
    id: s(r.id),
    instrumentId: s(r.instrumentId),
    status: typeof r.status === "number" ? r.status : 0,
    methodConfigId: s(r.methodConfigId),
    createdAt: s(r.createdAt),
  }));
  const groupsTotal = groupsQuery.data?.totalCount ?? 0;
  const groupsTotalPages = Math.max(1, Math.ceil(groupsTotal / (groupsQuery.data?.pageSize ?? 25)));

  /* ── Create form state ── */
  const [selectedInstrumentId, setSelectedInstrumentId] = useState("");
  const [methodConfigId, setMethodConfigId] = useState("");
  const [selectedCalIds, setSelectedCalIds] = useState<Set<string>>(new Set());
  const [icvRunId, setIcvRunId] = useState("");
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const instrumentsQuery = useQuery({
    queryKey: ["instruments", "picker"],
    queryFn: () => listInstruments({ pageSize: 100, sort: "name:asc" }),
    enabled: canCreate,
  });
  const instrumentOptions = useMemo(
    () => (instrumentsQuery.data?.items ?? []).map((r) => ({ id: s(r.id), name: s(r.name, s(r.id)) })),
    [instrumentsQuery.data],
  );

  const candidatesQuery = useQuery({
    queryKey: ["calibration-groups", "candidates", selectedInstrumentId],
    queryFn: () => getCalibrationGroupCandidates(selectedInstrumentId),
    enabled: selectedInstrumentId !== "" && canCreate,
  });

  const calCandidates = useMemo(() => {
    const data = candidatesQuery.data;
    const runs = (data?.calRuns ?? []) as Record<string, unknown>[];
    return runs.map(mapCandidate);
  }, [candidatesQuery.data]);

  const icvCandidates = useMemo(() => {
    const data = candidatesQuery.data;
    const runs = (data?.icvRuns ?? []) as Record<string, unknown>[];
    return runs.map(mapCandidate);
  }, [candidatesQuery.data]);

  const methodConfigsQuery = useQuery({
    queryKey: ["method-configs", "picker"],
    queryFn: () => listMethodConfigs({ pageSize: 100, sort: "name:asc" }),
    enabled: canCreate,
  });
  const methodOptions = useMemo(
    () => (methodConfigsQuery.data?.items ?? []).map((r) => ({ id: s(r.id), name: s(r.name, "(unnamed)") })),
    [methodConfigsQuery.data],
  );

  function onInstrumentChange(id: string) {
    setSelectedInstrumentId(id);
    setSelectedCalIds(new Set());
    setIcvRunId("");
  }

  function toggleCal(id: string) {
    setSelectedCalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onCreateDraft() {
    setBusy(true);
    setCreateError(null);
    try {
      if (selectedCalIds.size === 0) throw new Error("Select at least one eligible CAL run.");
      const res = await createCalibrationGroup({
        instrumentId: selectedInstrumentId,
        methodConfigId: methodConfigId.trim(),
        calRunIds: [...selectedCalIds],
        icvRunId: icvRunId.trim() || null,
      });
      const newId = s((res as { id?: unknown }).id);
      if (newId === "") throw new Error("API did not return a group id.");
      void groupsQuery.refetch();
      router.push(`/calibration-groups/${newId}`);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create group.");
    } finally {
      setBusy(false);
    }
  }

  const instrumentSelected = selectedInstrumentId !== "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calibration groups"
        description="Assemble CAL + optional ICV runs into a draft group for regression readiness checks."
      />

      {/* ── Groups list ── */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-medium">
            {groupsQuery.isLoading ? "Loading groups…" : `Groups (${groupsTotal})`}
          </div>
          <Button variant="secondary" type="button" onClick={() => void groupsQuery.refetch()}>
            Refresh
          </Button>
        </div>

        {groupsQuery.isError ? <div className="text-sm text-red-600">Failed to load groups.</div> : null}

        {groups.length === 0 && groupsQuery.isSuccess ? (
          <div className="text-sm text-neutral-500">No calibration groups yet.</div>
        ) : null}

        {groups.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="pb-2 text-left font-medium">Status</th>
                  <th className="pb-2 text-left font-medium">Instrument</th>
                  <th className="pb-2 text-left font-medium">Method config</th>
                  <th className="pb-2 text-left font-medium">Created</th>
                  <th className="pb-2 text-left font-medium">ID</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                {groups.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-4">
                      <Badge tone={groupStatusTone(row.status)}>
                        {GROUP_STATUS_LABEL[row.status] ?? String(row.status)}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                      {row.instrumentId.slice(0, 8)}…
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                      {row.methodConfigId.slice(0, 8)}…
                    </td>
                    <td className="py-2 pr-4">{formatDate(row.createdAt)}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                      {row.id.slice(0, 8)}…
                    </td>
                    <td className="py-2">
                      <Link className="text-blue-600 underline dark:text-blue-400" href={`/calibration-groups/${row.id}`}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {groupsTotalPages > 1 ? (
          <div className="mt-4 flex items-center gap-3 text-sm">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setGroupsPage((p) => Math.max(1, p - 1))}
              disabled={groupsPage <= 1}
            >
              Previous
            </Button>
            <span className="text-neutral-600 dark:text-neutral-400">
              Page {groupsPage} of {groupsTotalPages}
            </span>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setGroupsPage((p) => Math.min(groupsTotalPages, p + 1))}
              disabled={groupsPage >= groupsTotalPages}
            >
              Next
            </Button>
          </div>
        ) : null}
      </Card>

      {/* ── Create draft group ── */}
      {canCreate ? (
        <Card>
          <div className="mb-1 text-sm font-medium">Create draft group</div>
          <p className="mb-4 text-xs text-neutral-600 dark:text-neutral-400">
            Requires{" "}
            <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">perm.runs.upload</code> and an active lab
            technician profile.
          </p>
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); void onCreateDraft(); }}>
            <div>
              <Label htmlFor="cgInstrument">Instrument</Label>
              <Select
                id="cgInstrument"
                className="mt-1"
                value={selectedInstrumentId}
                onChange={(e) => onInstrumentChange(e.target.value)}
                required
              >
                <option value="">Select instrument…</option>
                {instrumentOptions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="cgMethod">Method configuration</Label>
              <Select
                id="cgMethod"
                className="mt-1"
                value={methodConfigId}
                onChange={(e) => setMethodConfigId(e.target.value)}
                required
              >
                <option value="">Select method config…</option>
                {methodOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <div className="mb-1 text-sm font-medium">CAL runs</div>
              <CalRunsContent
                instrumentSelected={instrumentSelected}
                isLoading={candidatesQuery.isLoading}
                isError={candidatesQuery.isError}
                candidates={calCandidates}
                selectedIds={selectedCalIds}
                onToggle={toggleCal}
              />
              <p className="mt-1 text-xs text-neutral-500">Selected: {selectedCalIds.size} CAL run(s).</p>
            </div>

            <div>
              <Label htmlFor="cgIcvPick">ICV run (optional)</Label>
              {instrumentSelected ? (
                <>
                  <Select
                    id="cgIcvPick"
                    className="mt-1"
                    value={icvRunId}
                    onChange={(e) => setIcvRunId(e.target.value)}
                  >
                    <option value="">None</option>
                    {icvCandidates
                      .filter((r) => r.isEligibleAsIcv)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {(r.name ?? `${r.id.slice(0, 8)}…`)} · {formatDate(r.runDate)}
                        </option>
                      ))}
                  </Select>
                  <Label htmlFor="cgIcvManual" className="mt-2 block">
                    Or enter ICV UUID
                  </Label>
                  <Input
                    id="cgIcvManual"
                    value={icvRunId}
                    onChange={(e) => setIcvRunId(e.target.value)}
                    className="mt-1 font-mono text-xs"
                    placeholder="Optional — overrides dropdown"
                  />
                </>
              ) : (
                <p className="mt-1 text-sm text-neutral-500">Select an instrument to load eligible ICV runs.</p>
              )}
            </div>

            {createError ? <div className="text-sm text-red-600">{createError}</div> : null}
            <Button
              type="submit"
              disabled={busy || selectedInstrumentId === "" || methodConfigId === "" || selectedCalIds.size === 0}
            >
              {busy ? "Creating…" : "Create draft group"}
            </Button>
          </form>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            You need{" "}
            <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">perm.runs.upload</code> to create
            calibration groups.
          </p>
        </Card>
      )}

      {/* ── Open by ID ── */}
      <Card>
        <div className="mb-3 text-sm font-medium">Open group by ID</div>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const t = openId.trim();
            if (t) router.push(`/calibration-groups/${t}`);
          }}
        >
          <div className="flex-1">
            <Label htmlFor="groupId">Group UUID</Label>
            <Input
              id="groupId"
              value={openId}
              onChange={(e) => setOpenId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="mt-1 font-mono text-sm"
            />
          </div>
          <Button type="submit" disabled={openId.trim() === ""}>
            View group
          </Button>
        </form>
      </Card>
    </div>
  );
}
