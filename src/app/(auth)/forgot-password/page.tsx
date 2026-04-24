"use client";

import { apiFetch } from "@/lib/api/client";
import { parseErrorResponse } from "@/lib/api/errors";
import { Button, Card, Input, Label } from "@/components/ui";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("Auth/forgot-password", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw await parseErrorResponse(res);
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h1 className="text-xl font-semibold">Forgot password</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        If an account exists, you will receive reset instructions.
      </p>
      {done ? (
        <div className="mt-6 text-sm text-neutral-700 dark:text-neutral-300">
          If the email is recognized, a reset link will be sent.
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Submitting…" : "Submit"}
          </Button>
        </form>
      )}
    </Card>
  );
}
