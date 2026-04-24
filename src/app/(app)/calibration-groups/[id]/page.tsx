"use client";

import { CalibrationGroupReadinessPanel } from "@/components/calibration-group-readiness-panel";
import { InternalStandardSummariesPanel } from "@/components/internal-standard-summaries-panel";
import { Badge, Button, Card, Label, PageHeader, Select } from "@/components/ui";
import {
  getCalibrationGroup,
  getCalibrationGroupCandidates,
  listMethodConfigs,
  updateCalibrationGroup,
} from "@/lib/api/wltr-api";
import { CalibrationGroupStatus, GROUP_STATUS_LABEL, hasPermission, PERMS, RUN_STATUS_LABEL } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

function s(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

type GroupDetail = Readonly<{
  id: string;
  instrumentId: string;
  status: number;
  methodConfigId: string;
  methodConfigSnapshotId: string | null;
  icvRunId: string | null;
  calRunIds: readonly string[];
  computedAt: string | null;
  computationVersion: string | null;
  createdAt: string;
}>;

type CandidateRun = Readonly<{
  id: string;
  runDate: string;
  status: number;
  calibrationLevelId: string | null;
  isEligibleAsCal: boolean;
  isEligibleAsIcv: boolean;
  ineligibilityReason: string | null;
}>;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "short" });
  } catch {
    return iso;
  }
}

function groupStatusTone(status: number): "ok" | "warn" | "bad" | "neutral" {
  if (status === CalibrationGroupStatus.Approved) return "ok";
  if (status === CalibrationGroupStatus.Rejected) return "bad";
  return "neutral";
}

function isEditable(status: number) {
  return status === CalibrationGroupStatus.Draft || status === CalibrationGroupStatus.Computed;
}

function mapGroupDetail(row: Record<string, unknown>, id: string): GroupDetail {
  return {
    id: s(row.id, id),
    instrumentId: s(row.instrumentId),
    status: typeof row.status === "number" ? row.status : 0,
    methodConfigId: s(row.methodConfigId),
    methodConfigSnapshotId: typeof row.methodConfigSnapshotId === "string" ? row.methodConfigSnapshotId : null,
    icvRunId: typeof row.icvRunId === "string" ? row.icvRunId : null,
    calRunIds: Array.isArray(row.calRunIds) ? (row.calRunIds as unknown[]).map((v) => s(v)) : [],
    computedAt: typeof row.computedAt === "string" ? row.computedAt : null,
    computationVersion: typeof row.computationVersion === "string" ? row.computationVersion : null,
    createdAt: s(row.createdAt),
  };
}

function mapCandidate(r: Record<string, unknown>): CandidateRun {
  return {
    id: s(r.id),
    runDate: s(r.runDate),
    status: typeof r.status === "number" ? r.status : 0,
    calibrationLevelId: typeof r.calibrationLevelId === "string" ? r.calibrationLevelId : null,
    isEligibleAsCal: Boolean(r.isEligibleAsCal),
    isEligibleAsIcv: Boolean(r.isEligibleAsIcv),
    ineligibilityReason: typeof r.ineligibilityReason === "string" ? r.ineligibilityReason : null,
  };
}

/* ── Edit CAL runs list ── */

type EditCalRunsProps = Readonly<{
  isLoading: boolean;
  candidates: readonly CandidateRun[];
  selectedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
}>;

function EditCalRuns({ isLoading, candidates, selectedIds, onToggle }: EditCalRunsProps) {
  if (isLoading) return <p className="text-sm text-neutral-500">Loading candidates…</p>;
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
                <span className="font-mono">{r.id.slice(0, 8)}…</span>
                {" · "}
                <span>{formatShortDate(r.runDate)}</span>
                {" · "}
                <span>{RUN_STATUS_LABEL[r.status] ?? String(r.status)}</span>
                {r.calibrationLevelId ? (
                  <span className="ml-1 text-neutral-500">
                    level: {r.calibrationLevelId.slice(0, 8)}…
                  </span>
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

/* ── Edit form hook ── */

function useGroupEdit(groupId: string, group: GroupDetail, onSaved: () => void) {
  const qc = useQueryClient();

  const [methodConfigId, setMethodConfigId] = useState(group.methodConfigId);
  const [selectedCalIds, setSelectedCalIds] = useState<ReadonlySet<string>>(new Set(group.calRunIds));
  const [icvRunId, setIcvRunId] = useState(group.icvRunId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const methodConfigsQuery = useQuery({
    queryKey: ["method-configs", "picker"],
    queryFn: () => listMethodConfigs({ pageSize: 100, sort: "name:asc" }),
  });
  const methodOptions = useMemo(
    () => (methodConfigsQuery.data?.items ?? []).map((r) => ({ id: s(r.id), name: s(r.name, "(unnamed)") })),
    [methodConfigsQuery.data],
  );

  const candidatesQuery = useQuery({
    queryKey: ["calibration-groups", "candidates", group.instrumentId],
    queryFn: () => getCalibrationGroupCandidates(group.instrumentId),
  });

  const calCandidates = useMemo(() => {
    const runs = (candidatesQuery.data?.calRuns ?? []) as Record<string, unknown>[];
    return runs.map(mapCandidate);
  }, [candidatesQuery.data]);

  const icvCandidates = useMemo(() => {
    const runs = (candidatesQuery.data?.icvRuns ?? []) as Record<string, unknown>[];
    return runs.map(mapCandidate);
  }, [candidatesQuery.data]);

  function toggleCal(runId: string) {
    setSelectedCalIds((prev) => {
      const next = new Set(prev);
      if (next.delete(runId)) return next;
      next.add(runId);
      return next;
    });
  }

  async function onSave() {
    setBusy(true);
    setError(null);
    try {
      if (selectedCalIds.size === 0) throw new Error("Select at least one CAL run.");
      await updateCalibrationGroup(groupId, {
        methodConfigId: methodConfigId.trim(),
        calRunIds: [...selectedCalIds],
        icvRunId: icvRunId.trim() || null,
      });
      await qc.invalidateQueries({ queryKey: ["calibration-groups", groupId] });
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  return {
    methodConfigId, setMethodConfigId,
    selectedCalIds, toggleCal,
    icvRunId, setIcvRunId,
    busy, error,
    methodOptions,
    calCandidates, icvCandidates,
    candidatesLoading: candidatesQuery.isLoading,
    onSave,
  };
}

/* ── Edit form ── */

type EditGroupFormProps = Readonly<{
  groupId: string;
  group: GroupDetail;
  onCancel: () => void;
  onSaved: () => void;
}>;

function EditGroupForm({ groupId, group, onCancel, onSaved }: EditGroupFormProps) {
  const {
    methodConfigId, setMethodConfigId,
    selectedCalIds, toggleCal,
    icvRunId, setIcvRunId,
    busy, error,
    methodOptions,
    calCandidates, icvCandidates,
    candidatesLoading,
    onSave,
  } = useGroupEdit(groupId, group, onSaved);

  return (
    <Card>
      <div className="mb-1 text-sm font-medium">Edit group</div>
      <p className="mb-4 text-xs text-neutral-500">
        Computed groups will revert to Draft when saved, clearing all computed results.
      </p>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); void onSave(); }}>
        <div>
          <Label htmlFor="editMethod">Method configuration</Label>
          <Select
            id="editMethod"
            className="mt-1"
            value={methodConfigId}
            onChange={(e) => setMethodConfigId(e.target.value)}
            required
          >
            <option value="">Select method config…</option>
            {methodOptions.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
        </div>

        <div>
          <div className="mb-1 text-sm font-medium">CAL runs</div>
          <EditCalRuns
            isLoading={candidatesLoading}
            candidates={calCandidates}
            selectedIds={selectedCalIds}
            onToggle={toggleCal}
          />
          <p className="mt-1 text-xs text-neutral-500">Selected: {selectedCalIds.size} CAL run(s).</p>
        </div>

        <div>
          <Label htmlFor="editIcvPick">ICV run (optional)</Label>
          <Select
            id="editIcvPick"
            className="mt-1"
            value={icvRunId}
            onChange={(e) => setIcvRunId(e.target.value)}
          >
            <option value="">None</option>
            {icvCandidates
              .filter((r) => r.isEligibleAsIcv)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id.slice(0, 8)}… · {formatShortDate(r.runDate)}
                </option>
              ))}
          </Select>
          <Label htmlFor="editIcvManual" className="mt-2 block">Or enter ICV UUID</Label>
          <input
            id="editIcvManual"
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
            value={icvRunId}
            onChange={(e) => setIcvRunId(e.target.value)}
            placeholder="Optional ICV run UUID"
          />
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        <div className="flex gap-3">
          <Button type="submit" disabled={busy || methodConfigId === "" || selectedCalIds.size === 0}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

/* ── Group detail card ── */

type GroupDetailCardProps = Readonly<{
  group: GroupDetail;
  showEditButton: boolean;
  onEdit: () => void;
}>;

function GroupDetailCard({ group, showEditButton, onEdit }: GroupDetailCardProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge tone={groupStatusTone(group.status)}>
            {GROUP_STATUS_LABEL[group.status] ?? String(group.status)}
          </Badge>
          {group.computedAt ? (
            <span className="text-xs text-neutral-500">Computed {formatDate(group.computedAt)}</span>
          ) : null}
        </div>
        {showEditButton ? (
          <Button variant="secondary" type="button" onClick={onEdit}>Edit group</Button>
        ) : null}
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-neutral-700 dark:text-neutral-300">Instrument</dt>
          <dd className="mt-0.5 font-mono text-xs">
            <Link className="text-blue-600 underline dark:text-blue-400" href={`/runs?instrumentId=${encodeURIComponent(group.instrumentId)}`}>
              {group.instrumentId}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-700 dark:text-neutral-300">Method config</dt>
          <dd className="mt-0.5 font-mono text-xs">
            <Link className="text-blue-600 underline dark:text-blue-400" href={`/method-configs/${group.methodConfigId}`}>
              {group.methodConfigId}
            </Link>
          </dd>
        </div>
        {group.methodConfigSnapshotId ? (
          <div>
            <dt className="font-medium text-neutral-700 dark:text-neutral-300">Snapshot</dt>
            <dd className="mt-0.5 font-mono text-xs">{group.methodConfigSnapshotId}</dd>
          </div>
        ) : null}
        <div>
          <dt className="font-medium text-neutral-700 dark:text-neutral-300">Created</dt>
          <dd className="mt-0.5">{formatDate(group.createdAt)}</dd>
        </div>
        {group.computationVersion ? (
          <div>
            <dt className="font-medium text-neutral-700 dark:text-neutral-300">Computation version</dt>
            <dd className="mt-0.5 font-mono text-xs">{group.computationVersion}</dd>
          </div>
        ) : null}
      </dl>

      <div>
        <div className="mb-2 text-sm font-medium">CAL runs ({group.calRunIds.length})</div>
        <ul className="space-y-1">
          {group.calRunIds.map((runId) => (
            <li key={runId}>
              <Link className="font-mono text-xs text-blue-600 underline dark:text-blue-400" href={`/runs/${runId}`}>
                {runId}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {group.icvRunId ? (
        <div>
          <div className="mb-1 text-sm font-medium">ICV run</div>
          <Link className="font-mono text-xs text-blue-600 underline dark:text-blue-400" href={`/runs/${group.icvRunId}`}>
            {group.icvRunId}
          </Link>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">No ICV run attached.</p>
      )}
    </div>
  );
}

/* ── Page ── */

export default function CalibrationGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useAuth();
  const canEdit = hasPermission(me, PERMS.runsUpload);
  const [editing, setEditing] = useState(false);

  const groupQuery = useQuery({
    queryKey: ["calibration-groups", id],
    queryFn: () => getCalibrationGroup(id),
  });

  const group: GroupDetail | null = useMemo(() => {
    if (!groupQuery.data) return null;
    return mapGroupDetail(groupQuery.data, id);
  }, [groupQuery.data, id]);

  const canEditGroup = canEdit && group !== null && isEditable(group.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calibration group"
        description={<span className="font-mono text-sm">{id}</span>}
        actions={
          <Link href="/calibration-groups">
            <Button variant="secondary" type="button">All groups</Button>
          </Link>
        }
      />

      <Card>
        {groupQuery.isLoading ? <div className="text-sm text-neutral-500">Loading group…</div> : null}
        {groupQuery.isError ? <div className="text-sm text-red-600">Failed to load group detail.</div> : null}
        {group ? (
          <GroupDetailCard
            group={group}
            showEditButton={canEditGroup && !editing}
            onEdit={() => setEditing(true)}
          />
        ) : null}
      </Card>

      {editing && canEditGroup && group ? (
        <EditGroupForm
          groupId={id}
          group={group}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      ) : null}

      <CalibrationGroupReadinessPanel groupId={id} me={me} />
      <InternalStandardSummariesPanel variant="calibrationGroup" resourceId={id} me={me} />
    </div>
  );
}
