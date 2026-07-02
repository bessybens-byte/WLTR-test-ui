"use client";

import { Button, Callout, Card, Input, Label, PageHeader, SkeletonLines } from "@/components/ui";
import { suggestionsAnalytes, unresolvedAnalytes } from "@/lib/api/wltr-api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

function s(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return fallback;
}

function pick(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v) return v;
    if (typeof v === "number") return String(v);
  }
  return "";
}

export default function AnalyteToolsPage() {
  const [rawName, setRawName] = useState("");
  const [top, setTop] = useState(10);
  const [activeQuery, setActiveQuery] = useState("");

  const unresolved = useQuery({
    queryKey: ["analytes", "unresolved"],
    queryFn: unresolvedAnalytes,
  });

  const suggestions = useQuery({
    queryKey: ["analytes", "suggestions", activeQuery, top],
    queryFn: () => suggestionsAnalytes(activeQuery || undefined, top),
    enabled: activeQuery.length > 0,
  });

  const unresolvedRows = (unresolved.data ?? []) as Record<string, unknown>[];
  const suggestionRows = (suggestions.data ?? []) as Record<string, unknown>[];

  function runSuggestion(name: string) {
    setRawName(name);
    setActiveQuery(name);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analyte tools"
        description="Find unmapped raw instrument names and get canonical-analyte match suggestions."
        actions={
          <Link href="/analytes">
            <Button variant="secondary" type="button">All analytes</Button>
          </Link>
        }
      />

      <Card>
        <div className="text-sm font-medium">Unresolved raw names</div>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Compound names seen on runs that don&apos;t map to any canonical analyte or alias. Resolve them on the run
          detail page, or use &ldquo;Suggest matches&rdquo; below to find the closest analyte.
        </p>
        <div className="mt-3">
          {unresolved.isLoading ? <SkeletonLines lines={3} /> : null}
          {unresolved.isError ? (
            <div className="text-sm text-red-600">{(unresolved.error as Error).message}</div>
          ) : null}
          {unresolved.isSuccess && unresolvedRows.length === 0 ? (
            <Callout tone="ok">No unresolved raw names — every compound maps to an analyte.</Callout>
          ) : null}
          {unresolvedRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                    <th className="px-2 py-2 font-medium">Raw compound name</th>
                    <th className="px-2 py-2 font-medium">Occurrences</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {unresolvedRows.map((row, i) => {
                    const name = pick(row, ["rawCompoundName", "rawName", "name", "compoundName"]);
                    const count = pick(row, ["occurrences", "count", "runCount", "measurementCount"]);
                    return (
                      <tr key={name || `row-${i}`} className="border-b border-neutral-100 dark:border-neutral-900">
                        <td className="px-2 py-2">{name || "—"}</td>
                        <td className="px-2 py-2 font-mono text-neutral-600 dark:text-neutral-400">{count || "—"}</td>
                        <td className="px-2 py-2 text-right">
                          <Button
                            type="button"
                            variant="secondary"
                            className="!py-1 !text-xs"
                            disabled={!name}
                            onClick={() => runSuggestion(name)}
                          >
                            Suggest matches
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="text-sm font-medium">Match suggestions</div>
        <form
          className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            setActiveQuery(rawName.trim());
          }}
        >
          <div>
            <Label htmlFor="rawName">Raw name to match</Label>
            <Input
              id="rawName"
              value={rawName}
              onChange={(e) => setRawName(e.target.value)}
              placeholder="e.g. Benzene, m/p-Xylene"
            />
          </div>
          <div>
            <Label htmlFor="top">Max results</Label>
            <Input
              id="top"
              type="number"
              min={1}
              max={50}
              className="w-28"
              value={top}
              onChange={(e) => setTop(Number(e.target.value))}
            />
          </div>
          <Button type="submit" disabled={!rawName.trim()}>
            Suggest
          </Button>
        </form>

        <div className="mt-4">
          {suggestions.isFetching ? <SkeletonLines lines={3} /> : null}
          {suggestions.isError ? (
            <div className="text-sm text-red-600">{(suggestions.error as Error).message}</div>
          ) : null}
          {suggestions.isSuccess && suggestionRows.length === 0 ? (
            <div className="text-sm text-neutral-500">No suggestions for &ldquo;{activeQuery}&rdquo;.</div>
          ) : null}
          {suggestionRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                    <th className="px-2 py-2 font-medium">Suggested analyte</th>
                    <th className="px-2 py-2 font-medium">Score</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {suggestionRows.map((row, i) => {
                    const analyteId = pick(row, ["analyteId", "id"]);
                    const name = pick(row, ["analyteName", "name", "canonicalName"]);
                    const scoreRaw = row.score ?? row.similarity ?? row.distance;
                    const score = typeof scoreRaw === "number" ? scoreRaw.toFixed(3) : s(scoreRaw);
                    return (
                      <tr key={analyteId || name || `row-${i}`} className="border-b border-neutral-100 dark:border-neutral-900">
                        <td className="px-2 py-2">{name || analyteId || "—"}</td>
                        <td className="px-2 py-2 font-mono text-neutral-600 dark:text-neutral-400">{score || "—"}</td>
                        <td className="px-2 py-2 text-right">
                          {analyteId ? (
                            <Link className="text-blue-600 underline dark:text-blue-400" href={`/analytes/${analyteId}`}>
                              Open analyte
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
