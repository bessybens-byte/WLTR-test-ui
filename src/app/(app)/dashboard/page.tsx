"use client";

import { clearRememberedLabId, getRememberedLabId, LabPicker } from "@/components/lab-picker";
import { Badge, Button, Card, Callout, EmptyState, Label, PageHeader, Skeleton } from "@/components/ui";
import { getDashboardSummary } from "@/lib/api/wltr-api";
import {
  actionItemHref,
  actionItemKey,
  actionItemLabel,
  dashboardErrorMessage,
  priorityTone,
} from "@/lib/dashboard-summary";
import { canSeeNavItem, mainNav } from "@/lib/nav";
import {
  displayName,
  groupStatusLabel,
  groupStatusTone,
  hasPermission,
  isPlatformOperator,
  PERMS,
} from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

function formatUtcDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

function MetricCard({ label, value, loading }: { label: string; value: number | null; loading: boolean }) {
  return (
    <Card>
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">
        {loading ? <Skeleton className="h-9 w-16" /> : (value ?? "—")}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { me } = useAuth();
  const perms = me?.permissions ?? [];
  const canView = hasPermission(me, PERMS.view);
  const platformOps = isPlatformOperator(me);
  const labInJwt = me?.laboratoryId;

  const [labFilter, setLabFilter] = useState(getRememberedLabId);

  const queryParams = useMemo(() => {
    const params: { laboratoryId?: string; limit: number } = { limit: 5 };
    if (platformOps && labFilter.trim()) params.laboratoryId = labFilter.trim();
    return params;
  }, [platformOps, labFilter]);

  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary", queryParams.laboratoryId ?? "", queryParams.limit],
    queryFn: () => getDashboardSummary(queryParams),
    enabled: canView,
  });

  const metrics = summaryQuery.data?.metrics;
  const recentGroups = summaryQuery.data?.recentCalibrationGroups ?? [];
  const actionItems = summaryQuery.data?.actionItems ?? [];
  const showInitialError = summaryQuery.isError && !summaryQuery.data;
  const showStaleWarning = summaryQuery.isError && !!summaryQuery.data;

  const canUpload = hasPermission(me, PERMS.runsUpload);
  const canManageConfig = hasPermission(me, PERMS.configEdit);
  const quickLinks = mainNav.filter(
    (item) => item.href !== "/dashboard" && item.href !== "/account" && canSeeNavItem(perms, item),
  );

  function clearLabFilter() {
    clearRememberedLabId();
    setLabFilter("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${displayName(me)}`}
        description="Lab workflow overview — instruments, calibration groups, and items needing attention."
        actions={
          canView ? (
            <Button
              variant="secondary"
              type="button"
              onClick={() => void summaryQuery.refetch()}
              disabled={summaryQuery.isFetching}
            >
              {summaryQuery.isFetching ? "Refreshing…" : "Refresh"}
            </Button>
          ) : null
        }
      />

      {!canView ? (
        <EmptyState
          title="Dashboard summary unavailable"
          hint="Your account does not have perm.view. Contact your lab administrator for read access to calibration data."
        />
      ) : showInitialError ? (
        <Card>
          <div className="text-sm text-red-600">{dashboardErrorMessage(summaryQuery.error)}</div>
          <div className="mt-3">
            <Button variant="secondary" type="button" onClick={() => void summaryQuery.refetch()}>
              Try again
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {platformOps ? (
            <Card>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-md flex-1">
                  <Label htmlFor="dashboardLabFilter">Laboratory filter</Label>
                  <p className="mb-2 text-xs text-neutral-600 dark:text-neutral-400">
                    Platform operators see all laboratories by default. Pick a lab to narrow metrics and recent groups.
                  </p>
                  <LabPicker id="dashboardLabFilter" value={labFilter} onChange={setLabFilter} />
                </div>
                {labFilter.trim() ? (
                  <Button variant="ghost" type="button" className="shrink-0" onClick={clearLabFilter}>
                    Clear filter
                  </Button>
                ) : null}
              </div>
            </Card>
          ) : labInJwt ? (
            <p className="text-xs text-neutral-500">
              Showing data for your laboratory (<span className="font-mono">{labInJwt}</span>).
            </p>
          ) : null}

          {showStaleWarning ? (
            <Callout tone="warn" title="Could not refresh dashboard">
              {dashboardErrorMessage(summaryQuery.error)} Showing the last loaded snapshot.
            </Callout>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Instruments active" value={metrics?.instrumentsActive ?? null} loading={summaryQuery.isLoading} />
            <MetricCard label="CAL runs today" value={metrics?.calRunsToday ?? null} loading={summaryQuery.isLoading} />
            <MetricCard label="Groups pending QA" value={metrics?.groupsPendingQa ?? null} loading={summaryQuery.isLoading} />
            <MetricCard label="Groups approved (MTD)" value={metrics?.groupsApprovedMtd ?? null} loading={summaryQuery.isLoading} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-sm font-medium">Recent calibration groups</div>
                <Link href="/calibration-groups" className="text-xs text-blue-600 underline dark:text-blue-400">
                  View all
                </Link>
              </div>

              {summaryQuery.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : recentGroups.length === 0 ? (
                <EmptyState title="No recent groups" hint="Create or compute a calibration group to see it here." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-800">
                        <th scope="col" className="pb-2 text-left font-medium">
                          Group
                        </th>
                        <th scope="col" className="pb-2 text-left font-medium">
                          Instrument
                        </th>
                        <th scope="col" className="pb-2 text-left font-medium">
                          Analytes
                        </th>
                        <th scope="col" className="pb-2 text-left font-medium">
                          Status
                        </th>
                        <th scope="col" className="pb-2 text-left font-medium">
                          Date (UTC)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                      {recentGroups.map((row) => (
                        <tr key={row.id}>
                          <td className="py-2 pr-4">
                            <Link
                              className="font-medium text-blue-600 underline dark:text-blue-400"
                              href={`/calibration-groups/${row.id}`}
                            >
                              {row.name?.trim() || `${row.id.slice(0, 8)}…`}
                            </Link>
                          </td>
                          <td className="py-2 pr-4">{row.instrumentName?.trim() || "—"}</td>
                          <td className="py-2 pr-4 tabular-nums">{row.analyteCount ?? "—"}</td>
                          <td className="py-2 pr-4">
                            <Badge tone={groupStatusTone(row.status)}>{groupStatusLabel(row.status)}</Badge>
                          </td>
                          <td className="py-2 pr-4 whitespace-nowrap">
                            {row.createdAt ? formatUtcDate(row.createdAt) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card>
              <div className="mb-4 text-sm font-medium">Action items</div>

              {summaryQuery.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : actionItems.length === 0 ? (
                <EmptyState title="No action items" hint="Recompute and review tasks appear here when groups need attention." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-800">
                        <th scope="col" className="pb-2 text-left font-medium">
                          Action
                        </th>
                        <th scope="col" className="pb-2 text-left font-medium">
                          Priority
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                      {actionItems.map((item) => {
                        const priority = item.priority?.trim() || "—";
                        const label = actionItemLabel(item);
                        return (
                          <tr key={actionItemKey(item)}>
                            <td className="py-2 pr-4">
                              <Link className="text-blue-600 underline dark:text-blue-400" href={actionItemHref(item)}>
                                {label}
                              </Link>
                            </td>
                            <td className="py-2 pr-4">
                              {priority !== "—" ? (
                                <Badge tone={priorityTone(priority)}>{priority}</Badge>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm font-medium">Your account</div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-neutral-600 dark:text-neutral-400">Email</dt>
              <dd className="min-w-0 break-all">{me?.email ?? "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-neutral-600 dark:text-neutral-400">Laboratory</dt>
              <dd className="min-w-0 break-all font-mono text-xs">{me?.laboratoryId ?? "Platform operator"}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <Link href="/account">
              <Button variant="secondary" type="button">
                Edit profile
              </Button>
            </Link>
          </div>
        </Card>

        <Card>
          <div className="text-sm font-medium">Common tasks</div>
          <ul className="mt-3 space-y-2 text-sm">
            {canUpload ? (
              <li>
                <Link className="text-blue-600 underline dark:text-blue-400" href="/runs/upload">
                  Upload a calibration or ICV run
                </Link>
              </li>
            ) : null}
            {canView ? (
              <li>
                <Link className="text-blue-600 underline dark:text-blue-400" href="/calibration-groups">
                  Review calibration groups
                </Link>
              </li>
            ) : null}
            {canView ? (
              <li>
                <Link className="text-blue-600 underline dark:text-blue-400" href="/lab-config">
                  {canManageConfig ? "Export or import lab configuration" : "Export lab configuration"}
                </Link>
              </li>
            ) : null}
            {canManageConfig ? (
              <li>
                <Link className="text-blue-600 underline dark:text-blue-400" href="/method-configs">
                  Configure regression rules
                </Link>
              </li>
            ) : null}
            {hasPermission(me, PERMS.usersManageLab) ? (
              <li>
                <Link className="text-blue-600 underline dark:text-blue-400" href="/invitations">
                  Invite a team member
                </Link>
              </li>
            ) : null}
            {!canUpload && !canManageConfig && !canView ? (
              <li className="text-neutral-500">Your role has limited access — contact your lab administrator.</li>
            ) : null}
          </ul>
        </Card>
      </div>

      {quickLinks.length ? (
        <Card>
          <div className="text-sm font-medium">All areas you can access</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {quickLinks.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button variant="secondary" type="button" className="text-xs">
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
