"use client";

import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { createInvitation } from "@/lib/api/wltr-api";
import { buildInvitationAcceptUrl } from "@/lib/invite-links";
import { useAuth } from "@/providers/auth-provider";
import { useMemo, useState } from "react";

export default function InvitationsPage() {
  const { me } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [expires, setExpires] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    laboratoryId: me?.laboratoryId ?? "",
    expiresInDays: 7,
    initialRoleId: "",
  });

  const invitationUrl = useMemo(
    () => (rawToken ? buildInvitationAcceptUrl(rawToken) : null),
    [rawToken],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setRawToken(null);
    setInvitationId(null);
    setExpires(null);
    try {
      const body: Record<string, unknown> = {
        email: form.email,
        expiresInDays: form.expiresInDays,
        initialRoleId: form.initialRoleId.trim() || undefined,
      };
      if (!me?.laboratoryId) body.laboratoryId = form.laboratoryId.trim() || undefined;
      const res = (await createInvitation(body)) as Record<string, unknown>;
      setRawToken(typeof res.rawToken === "string" ? res.rawToken : null);
      const id = res.invitationId;
      setInvitationId(typeof id === "string" ? id : null);
      setExpires(typeof res.expiresAtUtc === "string" ? res.expiresAtUtc : null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyText(value: string | null) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
  }

  const isPlatform = !me?.laboratoryId;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invitations"
        description={
          <>
            Create a one-time link for a new user to register. On success, the invitee gets an email containing the
            same acceptance URL you can copy below (form{" "}
            <code className="rounded bg-neutral-100 px-1 text-xs dark:bg-neutral-800">FrontendBaseUrl</code> +
            <code className="rounded bg-neutral-100 px-1 text-xs dark:bg-neutral-800">AcceptPath</code>
            <span className="whitespace-nowrap">?token=&lt;raw-token&gt;</span>). The raw token is only returned here
            once; the server stores only a hash.
          </>
        }
      />
      <Card>
        <div className="space-y-5 text-sm text-neutral-600 dark:text-neutral-400">
          <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs dark:border-neutral-800 dark:bg-neutral-900/60">
            <span className="font-medium text-neutral-800 dark:text-neutral-200">Local dev:</span> when backend{" "}
            <code className="font-mono text-[11px]">AzureEmail:Enabled</code> is <strong>false</strong>, the invite
            link may be <strong>printed to the API console</strong> instead of emailed — use that to test acceptance
            without Azure Communication Services.
          </p>
          {!isPlatform ? (
            <p>
              <strong className="text-neutral-800 dark:text-neutral-200">Lab admins</strong> invite only into your
              laboratory; you do not choose a separate lab id.
            </p>
          ) : (
            <p>
              <strong className="text-neutral-800 dark:text-neutral-200">Platform operators</strong> must set{" "}
              <strong>Laboratory ID</strong> to the target lab when your account has no lab scope in the JWT.
            </p>
          )}
          <p>
            <strong className="text-neutral-800 dark:text-neutral-200">Initial role:</strong> omit for the default{" "}
            <strong>Viewer</strong>. When you set an <strong>identity role id</strong>, the user receives that role on
            acceptance. The role must belong to the <strong>same laboratory</strong> (or be a <strong>built-in</strong>{" "}
            role). Unknown or cross-lab role ids return <strong>400</strong>.
          </p>
          {process.env.NEXT_PUBLIC_WLTR_APP_URL ? (
            <p className="text-xs">
              Public site URL for previews:{" "}
              <code className="rounded bg-neutral-100 px-1 font-mono dark:bg-neutral-800">
                {process.env.NEXT_PUBLIC_WLTR_APP_URL}
              </code>{" "}
              (<code className="font-mono">NEXT_PUBLIC_WLTR_APP_URL</code>).
            </p>
          ) : (
            <p className="text-xs">
              Preview links use your <strong>current browser origin</strong>. For production, set{" "}
              <code className="font-mono">NEXT_PUBLIC_WLTR_APP_URL</code> so this page matches the URL sent in invitation
              emails.
            </p>
          )}
        </div>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="email">Invitee email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          {isPlatform ? (
            <div>
              <Label htmlFor="laboratoryId">Laboratory ID</Label>
              <Input
                id="laboratoryId"
                value={form.laboratoryId}
                onChange={(e) => setForm({ ...form, laboratoryId: e.target.value })}
                placeholder="Target laboratory UUID"
                required
                className="font-mono text-xs"
              />
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="expiresInDays">Expires in days</Label>
              <Input
                id="expiresInDays"
                type="number"
                min={1}
                max={365}
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
                placeholder="ASP.NET Identity role id → Viewer if empty"
                className="font-mono text-xs"
              />
            </div>
          </div>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <Button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create invitation"}
          </Button>
        </form>

        {rawToken ? (
          <div className="mt-8 space-y-4 rounded-xl border border-amber-200/90 bg-gradient-to-b from-amber-50 to-white p-5 text-sm shadow-sm dark:border-amber-900/60 dark:from-amber-950/50 dark:to-neutral-950 dark:shadow-none">
            <div className="font-semibold text-amber-950 dark:text-amber-100">Save this — shown once</div>
            <p className="text-xs text-neutral-700 dark:text-neutral-300">
              The plaintext token matches <code className="rounded bg-amber-100/80 px-1 font-mono text-[11px] dark:bg-amber-950/70">token=</code>{" "}
              in the email link below. Invitees opening that link reach the acceptance screen with the token
              prefilled.
            </p>
            {invitationId ? (
              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                Invitation id: <span className="font-mono text-neutral-800 dark:text-neutral-200">{invitationId}</span>
              </div>
            ) : null}
            <div className="text-xs text-neutral-600 dark:text-neutral-400">
              Expires: <strong className="font-medium text-neutral-800 dark:text-neutral-200">{expires ?? "—"}</strong>
            </div>

            {invitationUrl ? (
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-neutral-700 dark:text-neutral-300">
                  Acceptance link (same as sent by email when email is enabled)
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-amber-200/70 bg-white/80 p-3 font-mono text-[11px] leading-relaxed text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
                  {invitationUrl}
                </pre>
                <Button type="button" variant="secondary" className="!text-xs" onClick={() => void copyText(invitationUrl)}>
                  Copy acceptance link
                </Button>
              </div>
            ) : null}

            <div className="border-t border-amber-200/60 pt-4 dark:border-amber-900/40">
              <div className="mb-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">Raw token only</div>
              <pre className="mb-3 max-h-36 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900">
                {rawToken}
              </pre>
              <Button type="button" variant="secondary" className="!text-xs" onClick={() => void copyText(rawToken)}>
                Copy raw token
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
