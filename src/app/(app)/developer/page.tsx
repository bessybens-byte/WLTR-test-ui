"use client";

import { Button, Card, Input, Label, PageHeader, Select, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/api/client";
import { useState } from "react";

export default function DeveloperPage() {
  const [method, setMethod] = useState<"GET" | "POST" | "PUT" | "DELETE" | "PATCH">("GET");
  const [path, setPath] = useState("Auth/me");
  const [query, setQuery] = useState("");
  const [body, setBody] = useState("{}");
  const [skipAuth, setSkipAuth] = useState(false);
  const [out, setOut] = useState<string>("");
  const [busy, setBusy] = useState(false);

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
        body: method === "GET" ? undefined : body,
        skipAuth,
        searchParams: Object.keys(sp).length ? sp : undefined,
      });
      const text = await res.text();
      setOut(`${res.status} ${res.statusText}\n\n${text}`);
      if (!res.ok) {
        // still show body
      }
    } catch (e: unknown) {
      setOut(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="API explorer"
        description="Invoke arbitrary WLTR endpoints through the same-origin proxy (or direct mode)."
      />
      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label htmlFor="m">Method</Label>
            <Select id="m" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
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
        <div className="mt-3">
          <Label htmlFor="b">JSON body (non-GET)</Label>
          <Textarea id="b" value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
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
  );
}
