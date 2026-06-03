"use client";

import { Button, Card } from "@/components/ui";
import { PERMISSION_LABELS } from "@/lib/routes";
import Link from "next/link";

export function AccessDenied({
  pathname,
  requiredPermissions,
}: {
  pathname: string;
  requiredPermissions: readonly string[];
}) {
  return (
    <Card className="mx-auto max-w-lg text-center">
      <div className="text-lg font-semibold">You don&apos;t have access to this page</div>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Your account is signed in, but it is missing the permission needed for{" "}
        <span className="font-mono text-xs">{pathname}</span>.
      </p>
      {requiredPermissions.length ? (
        <ul className="mt-4 space-y-1 text-left text-sm">
          {requiredPermissions.map((p) => (
            <li key={p} className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
              <span className="font-medium">{PERMISSION_LABELS[p] ?? p}</span>
              <div className="font-mono text-xs text-neutral-500">{p}</div>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-4 text-xs text-neutral-500">
        Ask your lab administrator to assign a role that includes the required permission, then sign out and back in
        after your role is updated.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/dashboard">
          <Button type="button">Back to dashboard</Button>
        </Link>
      </div>
    </Card>
  );
}
