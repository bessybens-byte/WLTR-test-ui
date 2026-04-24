"use client";

import { Card, PageHeader } from "@/components/ui";
import { healthRoot } from "@/lib/api/wltr-api";
import { useAuth } from "@/providers/auth-provider";
import { useQuery } from "@tanstack/react-query";

export default function DashboardPage() {
  const { me } = useAuth();
  const health = useQuery({
    queryKey: ["health"],
    queryFn: healthRoot,
  });

  return (
    <div>
      <PageHeader title="Dashboard" description="Signed-in overview and API health." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm font-medium">Identity</div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="w-36 text-neutral-600 dark:text-neutral-400">Email</dt>
              <dd className="min-w-0 break-all">{me?.email ?? "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-36 text-neutral-600 dark:text-neutral-400">Laboratory</dt>
              <dd className="min-w-0 break-all">{me?.laboratoryId ?? "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-36 text-neutral-600 dark:text-neutral-400">Roles</dt>
              <dd className="min-w-0">{(me?.roleNames ?? []).join(", ") || "—"}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <div className="text-sm font-medium">API root (GET /)</div>
          <div className="mt-3 text-sm">
            {health.isLoading ? "Loading…" : null}
            {health.isError ? <span className="text-red-600">{(health.error as Error).message}</span> : null}
            {health.isSuccess ? <pre className="whitespace-pre-wrap break-all font-mono text-xs">{health.data}</pre> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
