"use client";

import { Button, Card, Input, Label, PageHeader, Select, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/api/client";
import { getOpenApiInfo, listOpenApiOperations, type OpenApiOperation } from "@/lib/openapi/catalog";
import Link from "next/link";
import { useMemo, useState } from "react";

function apiPathToRelative(path: string): string {
  return path.replace(/^\/api\//, "");
}

export default function DeveloperPage() {
  const info = getOpenApiInfo();
  const operations = useMemo(() => listOpenApiOperations(), []);
  const tags = useMemo(() => [...new Set(operations.map((o) => o.tag))].sort(), [operations]);

  const [tagFilter, setTagFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(operations[0]?.id ?? "");
  const [method, setMethod] = useState<"GET" | "POST" | "PUT" | "DELETE" | "PATCH">("GET");
  const [path, setPath] = useState("Auth/me");
  const [query, setQuery] = useState("");
  const [body, setBody] = useState("{}");
  const [skipAuth, setSkipAuth] = useState(false);
  const [out, setOut] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return operations.filter((op) => {
      if (tagFilter && op.tag !== tagFilter) return false;
      if (!q) return true;
      return (
        op.path.toLowerCase().includes(q) ||
        op.summary.toLowerCase().includes(q) ||
        op.method.toLowerCase().includes(q)
      );
    });
  }, [operations, tagFilter, search]);

  const selected: OpenApiOperation | undefined =
    operations.find((o) => o.id === selectedId) ?? filtered[0];

  function applyOperation(op: OpenApiOperation) {
    setSelectedId(op.id);
    setMethod(op.method as typeof method);
    setPath(apiPathToRelative(op.path));
    setQuery("");
    setBody(op.method === "GET" || op.method === "DELETE" ? "" : "{}");
    setSkipAuth(
      op.path.startsWith("/api/Auth/login") ||
        op.path.startsWith("/api/Auth/refresh") ||
        op.path.startsWith("/api/Auth/forgot-password") ||
        op.path.startsWith("/api/Auth/reset-password") ||
        op.path.startsWith("/api/Auth/accept-invite"),
    );
  }

  async function run() {
    setBusy(true);
    setOut("");
    try {
      const sp: Record<string, string> = {};
      if (query.trim()) {
        const u = new URLSearchParams(query);
        u.forEach((v, k) => {
          sp[k] = v;
        });
      }
      const res = await apiFetch(path.replace(/^\//, ""), {
        method,
        body: method === "GET" || method === "DELETE" ? undefined : body,
        skipAuth,
        searchParams: Object.keys(sp).length ? sp : undefined,
      });
      const text = await res.text();
      setOut(`${res.status} ${res.statusText}\n\n${text}`);
    } catch (e: unknown) {
      setOut(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="API explorer"
        description={`Try ${info.title} endpoints through the app proxy. Browse ${operations.length} operations from the bundled OpenAPI document.`}
        actions={
          <Link href="/api-docs">
            <Button variant="secondary" type="button">
              API guide
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="flex max-h-[70vh] flex-col">
          <div className="text-sm font-medium">Operations</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="tag">Tag</Label>
              <Select id="tag" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
                <option value="">All tags</option>
                {tags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="path or summary"
              />
            </div>
          </div>
          <ul className="mt-3 min-h-0 flex-1 overflow-y-auto text-xs">
            {filtered.map((op) => (
              <li key={op.id}>
                <button
                  type="button"
                  className={`w-full rounded-lg px-2 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-900 ${
                    selected?.id === op.id ? "bg-neutral-100 dark:bg-neutral-900" : ""
                  }`}
                  onClick={() => applyOperation(op)}
                >
                  <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">{op.method}</span>{" "}
                  <span className="font-mono">{op.path}</span>
                  <div className="mt-0.5 text-neutral-600 dark:text-neutral-400">{op.summary}</div>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          {selected ? (
            <p className="mb-3 text-xs text-neutral-600 dark:text-neutral-400">{selected.description || selected.summary}</p>
          ) : null}
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label htmlFor="m">Method</Label>
              <Select id="m" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="p">Path (relative to /api)</Label>
              <Input id="p" value={path} onChange={(e) => setPath(e.target.value)} placeholder="e.g. analytes?page=1" />
            </div>
          </div>
          <div className="mt-3">
            <Label htmlFor="q">Query string (optional)</Label>
            <Input id="q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="page=1&pageSize=25" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input id="sa" type="checkbox" checked={skipAuth} onChange={(e) => setSkipAuth(e.target.checked)} />
            <Label htmlFor="sa">skipAuth (no Bearer)</Label>
          </div>
          {method !== "GET" && method !== "DELETE" ? (
            <div className="mt-3">
              <Label htmlFor="b">JSON body</Label>
              <Textarea id="b" value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
          ) : null}
          <div className="mt-3">
            <Button type="button" onClick={() => void run()} disabled={busy}>
              {busy ? "Running…" : "Send"}
            </Button>
          </div>
          <div className="mt-4">
            <Label>Response</Label>
            <pre className="mt-2 max-h-[480px] overflow-auto whitespace-pre-wrap rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs dark:border-neutral-800 dark:bg-neutral-950">
              {out || "—"}
            </pre>
          </div>
        </Card>
      </div>
    </div>
  );
}
