"use client";

import { AccessDenied } from "@/components/access-denied";
import { hasAnyPermission, resolveRoutePermissions } from "@/lib/routes";
import { useAuth } from "@/providers/auth-provider";
import { usePathname } from "next/navigation";

/**
 * Enforces route-level authorization after AuthGuard confirms the user is signed in.
 */
export function PermissionGuard({ children }: { children: React.ReactNode }) {
  const { me, loading } = useAuth();
  const pathname = usePathname();

  if (loading || !me) return null;

  const required = resolveRoutePermissions(pathname);
  if (required && !hasAnyPermission(me.permissions, required)) {
    return <AccessDenied pathname={pathname} requiredPermissions={required} />;
  }

  return <>{children}</>;
}
