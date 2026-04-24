"use client";

import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { createInvitation } from "@/lib/api/wltr-api";
import { useAuth } from "@/providers/auth-provider";
import { useState } from "react";

export default function InvitationsPage() {
  const { me } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [expires, setExpires] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    laboratoryId: me?.laboratoryId ?? "",
    expiresInDays: 7,
    initialRoleId: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setRawToken(null);
    setExpires(null);
    try {
      const body: Record<string, unknown> = {
        email: form.email,
        expiresInDays: form.expiresInDays,
        initialRoleId: form.initialRoleId || undefined,
      };
      if (!me?.laboratoryId) body.laboratoryId = form.laboratoryId || undefined;
      const res = (await createInvitation(body)) as Record<string, unknown>;
      setRawToken(typeof res.rawToken === "string" ? res.rawToken : null);
      setExpires(typeof res.expiresAtUtc === "string" ? res.expiresAtUtc : null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyToken() {
    if (!rawToken) return;
    await navigator.clipboard.writeText(rawToken);
  }

  return (
    <div>
      <PageHeader title="Invitations" description="Creates a one-time invitation token (shown once)." />
      <Card>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          {!me?.laboratoryId ? (
            <div>
              <Label htmlFor="laboratoryId">Laboratory id</Label>
              <Input
                id="laboratoryId"
                value={form.laboratoryId}
                onChange={(e) => setForm({ ...form, laboratoryId: e.target.value })}
                required
              />
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="expiresInDays">Expires in days</Label>
              <Input
                id="expiresInDays"
                type="number"
                value={form.expiresInDays}
                onChange={(e) => setForm({ ...form, expiresInDays: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="initialRoleId">Initial role id (optional)</Label>
              <Input
                id="initialRoleId"
                value={form.initialRoleId}
                onChange={(e) => setForm({ ...form, initialRoleId: e.target.value })}
              />
            </div>
          </div>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <Button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create invitation"}
          </Button>
        </form>

        {rawToken ? (
          <div className="mt-6 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950">
            <div className="font-medium text-amber-950 dark:text-amber-100">Copy this token now</div>
            <pre className="whitespace-pre-wrap break-all font-mono text-xs">{rawToken}</pre>
            <div className="text-xs text-neutral-700 dark:text-neutral-300">Expires: {expires ?? "—"}</div>
            <Button type="button" variant="secondary" onClick={() => void copyToken()}>
              Copy to clipboard
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
