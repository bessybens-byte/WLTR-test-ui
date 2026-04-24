"use client";

import { apiFetch } from "@/lib/api/client";
import { parseErrorResponse } from "@/lib/api/errors";
import { Button, Card, Input, Label } from "@/components/ui";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetForm() {
  const sp = useSearchParams();
  const [userId, setUserId] = useState(sp.get("userId") ?? "");
  const [token, setToken] = useState(sp.get("token") ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("Auth/reset-password", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ userId, token, newPassword }),
      });
      if (!res.ok) throw await parseErrorResponse(res);
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return done ? (
    <div className="text-sm text-neutral-700 dark:text-neutral-300">Password updated. You can sign in.</div>
  ) : (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <div>
        <Label htmlFor="userId">User id</Label>
        <Input id="userId" value={userId} onChange={(e) => setUserId(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="token">Reset token</Label>
        <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </div>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Card>
      <h1 className="text-xl font-semibold">Reset password</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Complete password reset using your email link.</p>
      <Suspense fallback={<div className="mt-6 text-sm">Loading…</div>}>
        <ResetForm />
      </Suspense>
    </Card>
  );
}
