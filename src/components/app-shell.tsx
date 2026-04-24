"use client";

import { canSeeNavItem, mainNav } from "@/lib/nav";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { me, logout } = useAuth();
  const pathname = usePathname();
  const perms = me?.permissions ?? [];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-4 py-6">
      <aside className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-6 space-y-2">
          <div className="mb-4 px-2">
            <div className="text-sm font-semibold">WLTR</div>
            <div className="mt-1 truncate text-xs text-neutral-600 dark:text-neutral-400">{me?.email}</div>
          </div>
          <nav className="space-y-1">
            {mainNav
              .filter((i) => canSeeNavItem(perms, i))
              .map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
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
