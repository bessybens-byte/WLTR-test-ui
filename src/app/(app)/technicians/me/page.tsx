"use client";

import { Card, PageHeader } from "@/components/ui";
import { getTechnicianMe } from "@/lib/api/wltr-api";
import { useQuery } from "@tanstack/react-query";

export default function TechnicianMePage() {
  const q = useQuery({
    queryKey: ["technician", "me"],
    queryFn: getTechnicianMe,
  });

  return (
    <div>
      <PageHeader title="My technician profile" description="GET /api/LabTechnicians/me" />
      <Card>
        {q.isLoading ? <div className="text-sm">Loading…</div> : null}
        {q.isError ? <div className="text-sm text-red-600">{(q.error as Error).message}</div> : null}
        {q.isSuccess ? (
          <pre className="overflow-x-auto text-xs">{JSON.stringify(q.data, null, 2)}</pre>
        ) : null}
      </Card>
    </div>
  );
}
