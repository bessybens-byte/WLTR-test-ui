"use client";

import { CalibrationGroupExcludedAnalytesPanel } from "@/components/calibration-group-excluded-analytes-panel";
import { CalibrationGroupTargetAnalytesPanel } from "@/components/calibration-group-target-analytes-panel";
import { CalibrationGroupComputePanel } from "@/components/calibration-group-compute-panel";
import { CalibrationGroupReadinessPanel } from "@/components/calibration-group-readiness-panel";
import { CalibrationGroupRegressionDebugPanel } from "@/components/calibration-group-regression-debug-panel";
import { CalibrationGroupRegressionInputsPanel } from "@/components/calibration-group-regression-inputs-panel";
import { CalibrationGroupRegressionResultsPanel } from "@/components/calibration-group-regression-results-panel";
import { CalibrationGroupSummaryReportPanel } from "@/components/calibration-group-summary-report-panel";
import { CalibrationGroupWorkflowPanel } from "@/components/calibration-group-workflow-panel";
import { InternalStandardSummariesPanel } from "@/components/internal-standard-summaries-panel";
import { Stepper, Tabs, type StepItem } from "@/components/tabs";
import { Badge, Button, Callout, Card, Input, Label, PageHeader, Select } from "@/components/ui";
import {
  getCalibrationGroup,
  getCalibrationGroupCandidates,
  getInstrument,
  getMethodConfig,
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

function normalizeGroupStatus(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const byName: Record<string, number> = {
    Draft: CalibrationGroupStatus.Draft,
    Computed: CalibrationGroupStatus.Computed,
    Approved: CalibrationGroupStatus.Approved,
    Rejected: CalibrationGroupStatus.Rejected,
  };
  if (typeof v === "string" && v in byName) return byName[v];
  return CalibrationGroupStatus.Draft;
}

type GroupDetail = Readonly<{
  id: string;
  name: string | null;
  instrumentId: string;
  status: number;
  methodConfigId: string;
  methodConfigSnapshotId: string | null;
  icvRunId: string | null;
  calRunIds: readonly string[];
  computedAt: string | null;
  computationVersion: string | null;
  computationStale: boolean;
  createdAt: string;
}>;

type CandidateRun = Readonly<{
  id: string;
  name: string | null;
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
  const rawName = typeof row.name === "string" ? row.name.trim() : "";
  return {
    id: s(row.id, id),
    name: rawName || null,
    instrumentId: s(row.instrumentId),
    status: normalizeGroupStatus(row.status),
    methodConfigId: s(row.methodConfigId),
    methodConfigSnapshotId: typeof row.methodConfigSnapshotId === "string" ? row.methodConfigSnapshotId : null,
    icvRunId: typeof row.icvRunId === "string" ? row.icvRunId : null,
    calRunIds: Array.isArray(row.calRunIds) ? (row.calRunIds as unknown[]).map((v) => s(v)) : [],
    computedAt: typeof row.computedAt === "string" ? row.computedAt : null,
    computationVersion: typeof row.computationVersion === "string" ? row.computationVersion : null,
    computationStale: Boolean(row.isComputationStale ?? row.computationStale),
    createdAt: s(row.createdAt),
  };
}

function mapCandidate(r: Record<string, unknown>): CandidateRun {
  const rawName = typeof r.name === "string" ? r.name.trim() : "";
  return {
    id: s(r.id),
    name: rawName || null,
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

  const [groupName, setGroupName] = useState(group.name ?? "");
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
        name: groupName.trim() || null,
        methodConfigId: methodConfigId.trim(),
        calRunIds: [...selectedCalIds],
        icvRunId: icvRunId.trim() || null,
      });
      await qc.invalidateQueries({ queryKey: ["calibration-groups", groupId] });
      await qc.invalidateQueries({ queryKey: ["calibration-group-regression-inputs", groupId] });
      await qc.invalidateQueries({ queryKey: ["calibration-group-readiness", groupId] });
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  return {
    groupName, setGroupName,
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
    groupName, setGroupName,
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
          <Label htmlFor="editName">Group name</Label>
          <Input
            id="editName"
            className="mt-1"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Display name for this calibration group"
          />
        </div>

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
                  {r.name ?? `${r.id.slice(0, 8)}…`} · {formatShortDate(r.runDate)}
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
  instrumentName?: string | null;
  methodName?: string | null;
  showEditButton: boolean;
  onEdit: () => void;
}>;

function GroupDetailCard({ group, instrumentName, methodName, showEditButton, onEdit }: GroupDetailCardProps) {
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
          {group.computationStale ? (
            <Badge tone="warn">Computation stale — recompute</Badge>
          ) : null}
        </div>
        {showEditButton ? (
          <Button variant="secondary" type="button" onClick={onEdit}>Edit group</Button>
        ) : null}
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="font-medium text-neutral-700 dark:text-neutral-300">Display name</dt>
          <dd className="mt-0.5">
            {group.name ?? (
              <span className="text-neutral-500">
                Not set — use <span className="font-medium">Edit group</span> to add a name
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-700 dark:text-neutral-300">Instrument</dt>
          <dd className="mt-0.5">
            <Link
              className="text-blue-600 underline dark:text-blue-400"
              href={`/instruments/${group.instrumentId}`}
            >
              {instrumentName || <span className="font-mono text-xs">{group.instrumentId}</span>}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-700 dark:text-neutral-300">Method config</dt>
          <dd className="mt-0.5">
            <Link className="text-blue-600 underline dark:text-blue-400" href={`/method-configs/${group.methodConfigId}`}>
              {methodName || <span className="font-mono text-xs">{group.methodConfigId}</span>}
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

type GroupTabId = "overview" | "setup" | "compute" | "review" | "debug";

function buildSteps(status: number, stale: boolean): StepItem[] {
  const computed = status >= CalibrationGroupStatus.Computed;
  const approved = status === CalibrationGroupStatus.Approved;
  const rejected = status === CalibrationGroupStatus.Rejected;
  return [
    {
      id: "setup",
      label: "Setup",
      state: status === CalibrationGroupStatus.Draft ? "current" : "done",
    },
    {
      id: "compute",
      label: "Compute",
      state: computed ? (stale ? "blocked" : "done") : status === CalibrationGroupStatus.Draft ? "todo" : "current",
    },
    {
      id: "model",
      label: "Model",
      state: approved ? "done" : computed && !stale ? "current" : "todo",
    },
    {
      id: "approve",
      label: "QA sign-off",
      state: approved ? "done" : rejected ? "blocked" : computed && !stale ? "current" : "todo",
    },
  ];
}

/** Maps a stepper step id to the tab that hosts its UI. */
const STEP_TO_TAB: Record<string, GroupTabId> = {
  setup: "setup",
  compute: "compute",
  model: "compute",
  approve: "compute",
};

export default function CalibrationGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useAuth();
  const canEdit = hasPermission(me, PERMS.runsUpload);
  const canCompute = hasPermission(me, PERMS.runsUpload);
  const canViewRegressionDebug = hasPermission(me, PERMS.groupsApprove);
  const canViewCalibrationChart = hasPermission(me, PERMS.view);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<GroupTabId>("overview");

  const groupQuery = useQuery({
    queryKey: ["calibration-groups", id],
    queryFn: () => getCalibrationGroup(id),
  });

  const group: GroupDetail | null = useMemo(() => {
    if (!groupQuery.data) return null;
    return mapGroupDetail(groupQuery.data, id);
  }, [groupQuery.data, id]);

  const instrumentQuery = useQuery({
    queryKey: ["instrument", group?.instrumentId],
    queryFn: () => getInstrument(group!.instrumentId),
    enabled: !!group?.instrumentId,
  });
  const methodQuery = useQuery({
    queryKey: ["method-config", group?.methodConfigId],
    queryFn: () => getMethodConfig(group!.methodConfigId),
    enabled: !!group?.methodConfigId,
  });
  const instrumentName = s((instrumentQuery.data as Record<string, unknown> | undefined)?.name) || null;
  const methodName = s((methodQuery.data as Record<string, unknown> | undefined)?.name) || null;

  const canEditGroup = canEdit && group !== null && isEditable(group.status);
  const computed = !!group && group.status >= CalibrationGroupStatus.Computed;

  const tabs = useMemo(
    () =>
      [
        { id: "overview", label: "Overview" },
        { id: "setup", label: "Setup & readiness" },
        { id: "compute", label: "Compute & model" },
        { id: "review", label: "Review" },
        ...(canViewRegressionDebug ? [{ id: "debug", label: "QA debug" }] : []),
      ] as const,
    [canViewRegressionDebug],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={group?.name ?? "Calibration group"}
        description={
          group ? (
            <span className="flex items-center gap-2">
              <Badge tone={groupStatusTone(group.status)}>
                {GROUP_STATUS_LABEL[group.status] ?? String(group.status)}
              </Badge>
              {group.computationStale ? <Badge tone="warn">Recompute needed</Badge> : null}
            </span>
          ) : (
            <span className="font-mono text-sm">{id}</span>
          )
        }
        actions={
          <Link href="/calibration-groups">
            <Button variant="secondary" type="button">All groups</Button>
          </Link>
        }
      />

      {groupQuery.isLoading ? <Card><div className="text-sm text-neutral-500">Loading group…</div></Card> : null}
      {groupQuery.isError ? (
        <Callout tone="bad" title="Failed to load group">
          The calibration group could not be loaded. It may not exist or be outside your laboratory.
        </Callout>
      ) : null}

      {group ? (
        <>
          <Card>
            <Stepper steps={buildSteps(group.status, group.computationStale)} onSelect={(sid) => setTab(STEP_TO_TAB[sid] ?? "overview")} />
          </Card>

          <Tabs tabs={tabs} active={tab} onChange={(t) => setTab(t as GroupTabId)} />

          {tab === "overview" ? (
            <div className="space-y-6">
              <Card>
                <GroupDetailCard
                  group={group}
                  instrumentName={instrumentName}
                  methodName={methodName}
                  showEditButton={canEditGroup && !editing}
                  onEdit={() => setEditing(true)}
                />
              </Card>
              {editing && canEditGroup ? (
                <EditGroupForm
                  groupId={id}
                  group={group}
                  onCancel={() => setEditing(false)}
                  onSaved={() => setEditing(false)}
                />
              ) : null}
              <InternalStandardSummariesPanel variant="calibrationGroup" resourceId={id} me={me} />
            </div>
          ) : null}

          {tab === "setup" ? (
            <div className="space-y-6">
              <CalibrationGroupReadinessPanel groupId={id} me={me} />
              <CalibrationGroupTargetAnalytesPanel groupId={id} canEdit={canEdit} />
              <CalibrationGroupExcludedAnalytesPanel groupId={id} canEdit={canEdit} />
            </div>
          ) : null}

          {tab === "compute" ? (
            <div className="space-y-6">
              {canCompute && isEditable(group.status) ? (
                <CalibrationGroupComputePanel groupId={id} me={me} canCompute />
              ) : null}
              {computed ? (
                <CalibrationGroupWorkflowPanel
                  groupId={id}
                  groupStatus={group.status}
                  computationStale={group.computationStale}
                  me={me}
                />
              ) : (
                <Callout tone="info" title="Not computed yet">
                  Run regression from the Compute panel (or Setup tab once readiness passes) to compare model variants,
                  select a model per analyte, and submit for QA sign-off.
                </Callout>
              )}
            </div>
          ) : null}

          {tab === "review" ? (
            <div className="space-y-6">
              {computed ? (
                <CalibrationGroupSummaryReportPanel groupId={id} groupStatus={group.status} me={me} />
              ) : (
                <Callout tone="info" title="No results to review">
                  Compute the group first to view the summary report, regression inputs, and calibration charts.
                </Callout>
              )}
              <CalibrationGroupRegressionInputsPanel
                groupId={id}
                me={me}
                canManagePoints={Boolean(canEdit && isEditable(group.status))}
              />
              {canViewCalibrationChart ? (
                <CalibrationGroupRegressionResultsPanel
                  groupId={id}
                  me={me}
                  canSummarizeFromDebug={canViewRegressionDebug}
                />
              ) : null}
            </div>
          ) : null}

          {tab === "debug" && canViewRegressionDebug ? (
            <div className="space-y-6">
              <CalibrationGroupRegressionDebugPanel groupId={id} me={me} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
