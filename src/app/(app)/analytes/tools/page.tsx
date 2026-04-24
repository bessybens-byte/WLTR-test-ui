"use client";

import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { suggestionsAnalytes, unresolvedAnalytes } from "@/lib/api/wltr-api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export default function AnalyteToolsPage() {
  const [rawName, setRawName] = useState("");
  const [top, setTop] = useState(10);

  const unresolved = useQuery({
    queryKey: ["analytes", "unresolved"],
    queryFn: unresolvedAnalytes,
  });

  const suggestions = useQuery({
    queryKey: ["analytes", "suggestions", rawName, top],
    queryFn: () => suggestionsAnalytes(rawName || undefined, top),
    enabled: false,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Analyte tools" description="Suggestions and unresolved raw names." />

      <Card>
        <div className="text-sm font-medium">Unresolved raw names</div>
        <div className="mt-3">
          {unresolved.isLoading ? <div className="text-sm">Loading…</div> : null}
          {unresolved.isError ? <div className="text-sm text-red-600">{(unresolved.error as Error).message}</div> : null}
          {unresolved.isSuccess ? (
            <pre className="overflow-x-auto text-xs">{JSON.stringify(unresolved.data, null, 2)}</pre>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="text-sm font-medium">Suggestions</div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <Label htmlFor="rawName">rawName</Label>
            <Input id="rawName" value={rawName} onChange={(e) => setRawName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="top">top</Label>
            <Input id="top" type="number" value={top} onChange={(e) => setTop(Number(e.target.value))} />
          </div>
        </div>
        <div className="mt-3">
          <Button type="button" variant="secondary" onClick={() => suggestions.refetch()}>
            Run
          </Button>
        </div>
        <div className="mt-3">
          {suggestions.isFetching ? <div className="text-sm">Loading…</div> : null}
          {suggestions.isError ? <div className="text-sm text-red-600">{(suggestions.error as Error).message}</div> : null}
          {suggestions.isSuccess ? (
            <pre className="overflow-x-auto text-xs">{JSON.stringify(suggestions.data, null, 2)}</pre>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
