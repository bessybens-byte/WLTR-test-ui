"use client";

import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { acceptInviteRegister } from "@/lib/api/wltr-api";
import { INVITE_ACCEPT_PATH } from "@/lib/invite-links";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function AcceptInviteFormInner() {
  const sp = useSearchParams();
  const [identityError, setIdentityError] = useState<string | null>(null);

  useEffect(() => {
    document.title = `Accept invite — WLTR QA`;
    return () => {
      document.title = `WLTR QA`;
    };
  }, []);

  const tokenFromLink = !!sp?.get("token")?.trim();
  const [token, setToken] = useState(() => sp.get("token")?.trim() ?? "");

  useEffect(() => {
    const t = sp?.get("token")?.trim();
    if (t) setToken(t);
  }, [sp]);

  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setIdentityError(null);
    setResult(null);

    try {
      setBusy(true);
      await acceptInviteRegister({ token: token.trim(), password: pwd, confirmPassword: pwd });
      const tail = tokenFromLink ? " (token came from your invitation URL.)" : "";
      setResult(`Success. You can sign in now.${tail}`);
      setPwd("");
    } catch (err: unknown) {
      setIdentityError(err instanceof Error ? err.message : "Invitation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={tokenFromLink ? "ring-2 ring-neutral-300 dark:ring-neutral-600" : ""}>
      <h1 className="text-xl font-semibold">Accept invite</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Invitation links match{" "}
        <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">{INVITE_ACCEPT_PATH}?token=&lt;raw-token&gt;</code>.
        Opening that link fills the token below; otherwise paste it from whoever invited you.
      </p>
      <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
        {tokenFromLink
          ? "Token prefilled from the URL query (`token`)."
          : "No `token` in the URL — paste the plaintext token manually."}
      </div>

      <form className="mt-6 space-y-4" autoComplete="on" onSubmit={submit}>
        {tokenFromLink ? (
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Same plaintext value as shown once after creating an invitation; not stored retrievably on the server.
          </p>
        ) : null}

        <div>
          <Label htmlFor="invite-token">Invitation token</Label>
          <Textarea
            id="invite-token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            spellCheck={false}
            className="min-h-[7rem] font-mono text-xs"
            aria-invalid={!!identityError}
            placeholder="Invitation token…"
            required
          />
        </div>
        <div>
          <Label htmlFor="invite-pwd">Password</Label>
          <Input
            id="invite-pwd"
            name="pwd"
            type="password"
            autoComplete="new-password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            required
            placeholder="Define your password"
          />
        </div>
        {identityError ? <div className="text-sm text-red-600">{identityError}</div> : null}
        {result ? <div className="text-sm text-emerald-700 dark:text-emerald-400">{result}</div> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Accepting…" : "Accept invitation"}
        </Button>
      </form>
      <div className="mt-4 text-sm">
        <Link className="text-neutral-700 underline dark:text-neutral-300" href="/login">
          Sign in
        </Link>
      </div>
    </Card>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-sm dark:border-neutral-800 dark:bg-neutral-900">
          Loading…
        </div>
      }
    >
      <AcceptInviteFormInner />
    </Suspense>
  );
}
