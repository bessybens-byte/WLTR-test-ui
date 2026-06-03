"use client";

import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { canSeeNavItem, mainNav } from "@/lib/nav";
import { healthRoot } from "@/lib/api/wltr-api";
import { displayName, hasPermission, PERMS } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

export default function DashboardPage() {
  const { me } = useAuth();
  const perms = me?.permissions ?? [];

  const health = useQuery({
    queryKey: ["health-root"],
    queryFn: () => healthRoot(),
  });

  const healthLabel = health.data?.trim() || null;
  const isOnline = health.isSuccess && Boolean(healthLabel);

  const quickLinks = mainNav.filter(
    (item) =>
      item.href !== "/dashboard" &&
      item.href !== "/account" &&
      canSeeNavItem(perms, item),
  );

  const canUpload = hasPermission(me, PERMS.runsUpload);
  const canManageConfig = hasPermission(me, PERMS.configEdit);

  return (
    <div>
      <PageHeader
        title={`Welcome, ${displayName(me)}`}
        description="WLTR helps your laboratory upload instrument runs, build calibration groups, and approve regression results with full traceability."
      />

      <div className="mb-6">
        <Card className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">WLTR API host</div>
            <div className="mt-1 text-sm font-medium">
              {health.isLoading ? "Checking…" : isOnline ? "Online" : "Unavailable"}
            </div>
          </div>
          <Badge tone={isOnline ? "ok" : health.isError ? "bad" : "neutral"}>{healthLabel ?? "—"}</Badge>
        </Card>
      </div>

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
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-neutral-600 dark:text-neutral-400">Roles</dt>
              <dd className="flex min-w-0 flex-wrap gap-1">
                {(me?.roleNames ?? []).length
                  ? (me?.roleNames ?? []).map((r) => (
                      <Badge key={r} tone="neutral">
                        {r}
                      </Badge>
                    ))
                  : "—"}
              </dd>
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
            {hasPermission(me, PERMS.view) ? (
              <li>
                <Link className="text-blue-600 underline dark:text-blue-400" href="/calibration-groups">
                  Review calibration groups
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
            {!canUpload && !canManageConfig && !hasPermission(me, PERMS.view) ? (
              <li className="text-neutral-500">Your role has limited access — contact your lab administrator.</li>
            ) : null}
          </ul>
        </Card>
      </div>

      {quickLinks.length ? (
        <Card className="mt-4">
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
