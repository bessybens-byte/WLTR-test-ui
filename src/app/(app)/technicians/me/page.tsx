"use client";

import { Badge, Button, Card, PageHeader, SkeletonLines } from "@/components/ui";
import { getTechnicianMe } from "@/lib/api/wltr-api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

function s(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return fallback;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-neutral-100 py-2 last:border-b-0 dark:border-neutral-900 sm:flex-row sm:gap-4">
      <dt className="w-40 shrink-0 text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default function TechnicianMePage() {
  const q = useQuery({
    queryKey: ["technician", "me"],
    queryFn: getTechnicianMe,
  });

  const d = (q.data ?? {}) as Record<string, unknown>;
  const name = [s(d.firstName), s(d.lastName)].filter(Boolean).join(" ");
  const roles = Array.isArray(d.roleNames) ? (d.roleNames as unknown[]).map((r) => s(r)).filter(Boolean) : [];
  const isActive = d.isActive !== false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My technician profile"
        description="Your laboratory technician record."
        actions={
          <Link href="/account">
            <Button variant="secondary" type="button">Edit profile</Button>
          </Link>
        }
      />
      <Card>
        {q.isLoading ? <SkeletonLines lines={5} /> : null}
        {q.isError ? <div className="text-sm text-red-600">{(q.error as Error).message}</div> : null}
        {q.isSuccess ? (
          <dl className="text-sm">
            <Row label="Name">{name || <span className="text-neutral-500">—</span>}</Row>
            <Row label="Email">{s(d.email) || "—"}</Row>
            <Row label="Status">
              <Badge tone={isActive ? "ok" : "bad"}>{isActive ? "Active" : "Inactive"}</Badge>
            </Row>
            {s(d.qualifications) ? <Row label="Qualifications">{s(d.qualifications)}</Row> : null}
            {s(d.hireDate) ? <Row label="Hire date">{formatDate(s(d.hireDate))}</Row> : null}
            <Row label="Laboratory">
              {s(d.laboratoryName) || (
                <span className="font-mono text-xs">{s(d.laboratoryId) || "Platform operator"}</span>
              )}
            </Row>
            {roles.length ? (
              <Row label="Roles">
                <span className="flex flex-wrap gap-1">
                  {roles.map((r) => (
                    <Badge key={r} tone="neutral">
                      {r}
                    </Badge>
                  ))}
                </span>
              </Row>
            ) : null}
          </dl>
        ) : null}
      </Card>
    </div>
  );
}
