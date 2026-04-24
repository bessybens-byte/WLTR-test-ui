"use client";

import { Card, PageHeader } from "@/components/ui";
import { getMethodConfigSnapshot } from "@/lib/api/wltr-api";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export default function MethodConfigSnapshotDetailPage() {
  const { id, version } = useParams<{ id: string; version: string }>();
  const v = Number(version);
  const q = useQuery({
    queryKey: ["method-config-snapshot", id, v],
    queryFn: () => getMethodConfigSnapshot(id, v),
    enabled: !!id && Number.isFinite(v),
  });

  return (
    <div>
      <PageHeader title="Snapshot" description={`${id} · v${version}`} />
      <Card>
        {q.isLoading ? <div className="text-sm">Loading…</div> : null}
        {q.isError ? <div className="text-sm text-red-600">{(q.error as Error).message}</div> : null}
        {q.isSuccess ? <pre className="overflow-x-auto text-xs">{JSON.stringify(q.data, null, 2)}</pre> : null}
      </Card>
    </div>
  );
}
