"use client";

import { mainNav } from "@/lib/nav";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Human labels for path segments that aren't top-level nav items. */
const SEGMENT_LABELS: Record<string, string> = {
  new: "New",
  upload: "Upload",
  tools: "Tools",
  snapshots: "Snapshots",
  me: "Me",
  account: "My profile",
  dashboard: "Dashboard",
};

const NAV_LABEL_BY_HREF = new Map(mainNav.map((i) => [i.href, i.label]));

function labelForSegment(segment: string, hrefSoFar: string): string {
  const navLabel = NAV_LABEL_BY_HREF.get(hrefSoFar);
  if (navLabel) return navLabel;
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  // UUID-ish or numeric detail segment → short, readable token.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(segment)) return `${segment.slice(0, 8)}…`;
  if (/^\d+$/.test(segment)) return `#${segment}`;
  // Kebab/slug → Title Case.
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Breadcrumb trail derived from the current pathname and nav labels. */
export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Don't show breadcrumbs on the dashboard root — it's the home.
  if (segments.length === 0 || (segments.length === 1 && segments[0] === "dashboard")) {
    return null;
  }

  const crumbs = segments.map((segment, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    return { href, label: labelForSegment(segment, href), isLast: idx === segments.length - 1 };
  });

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-neutral-500">
      <Link href="/dashboard" className="hover:text-neutral-800 dark:hover:text-neutral-200">
        Home
      </Link>
      {crumbs.map((c) => (
        <span key={c.href} className="flex items-center gap-1">
          <span aria-hidden className="text-neutral-300 dark:text-neutral-700">
            /
          </span>
          {c.isLast ? (
            <span className="font-medium text-neutral-700 dark:text-neutral-300">{c.label}</span>
          ) : (
            <Link href={c.href} className="hover:text-neutral-800 dark:hover:text-neutral-200">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
