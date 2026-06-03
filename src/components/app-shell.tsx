"use client";

import { Button } from "@/components/ui";
import { canSeeNavItem, navSections } from "@/lib/nav";
import { cn } from "@/lib/cn";
import { displayName } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

function NavLinks({
  pathname,
  perms,
  onNavigate,
}: {
  pathname: string;
  perms: string[];
  onNavigate?: () => void;
}) {
  return (
    <>
      {navSections.map((section) => {
        const items = section.items.filter((i) => canSeeNavItem(perms, i));
        if (!items.length) return null;
        return (
          <div key={section.title} className="space-y-1">
            <div className="px-3 pt-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 first:pt-0">
              {section.title}
            </div>
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm",
                    active
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { me, logout } = useAuth();
  const pathname = usePathname();
  const perms = me?.permissions ?? [];
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-4 md:flex-row md:gap-6 md:py-6">
      <div className="flex items-center justify-between md:hidden">
        <div>
          <div className="text-sm font-semibold">WLTR</div>
          <div className="truncate text-xs text-neutral-600 dark:text-neutral-400">{me?.email}</div>
        </div>
        <Button variant="secondary" type="button" onClick={() => setMobileOpen((o) => !o)}>
          {mobileOpen ? "Close" : "Menu"}
        </Button>
      </div>

      {mobileOpen ? (
        <nav className="space-y-1 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950 md:hidden">
          <NavLinks pathname={pathname} perms={perms} onNavigate={() => setMobileOpen(false)} />
          <div className="pt-3">
            <Button variant="secondary" className="w-full" onClick={() => void logout()}>
              Sign out
            </Button>
          </div>
        </nav>
      ) : null}

      <aside className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-6 space-y-2">
          <div className="mb-4 px-2">
            <div className="text-sm font-semibold">WLTR</div>
            <div className="mt-1 text-sm font-medium">{displayName(me)}</div>
            <div className="truncate text-xs text-neutral-600 dark:text-neutral-400">{me?.email}</div>
            {(me?.roleNames ?? []).length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {(me?.roleNames ?? []).map((r) => (
                  <span
                    key={r}
                    className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium dark:bg-neutral-800"
                  >
                    {r}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <nav className="space-y-1">
            <NavLinks pathname={pathname} perms={perms} />
          </nav>
          <div className="pt-4">
            <Button variant="secondary" className="w-full" onClick={() => void logout()}>
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
