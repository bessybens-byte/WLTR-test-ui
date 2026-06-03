"use client";

import { Button, Card, Input, Label } from "@/components/ui";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { login, me, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && me) router.replace("/dashboard");
  }, [loading, me, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading || me) return null;

  return (
    <Card>
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">WLTR laboratory portal</p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <div className="mt-4 text-sm">
        <Link className="text-neutral-700 underline dark:text-neutral-300" href="/forgot-password">
          Forgot password?
        </Link>
      </div>
    </Card>
  );
}
