import { PERMS } from "@/lib/types/wltr";

/** Route access rule — first matching pattern wins. */
export type RouteRule = {
  /** Pathname regex (anchored). */
  pattern: RegExp;
  /** Required permissions; omit for any signed-in user. */
  permissions?: readonly string[];
};

/**
 * Central route → permission map. Keeps deep links aligned with sidebar visibility.
 * Patterns are ordered most-specific first.
 */
export const ROUTE_RULES: readonly RouteRule[] = [
  { pattern: /^\/laboratories\/new$/, permissions: [PERMS.laboratoriesCreate] },
  { pattern: /^\/laboratories(\/|$)/, permissions: [PERMS.view] },

  { pattern: /^\/technicians\/new$/, permissions: [PERMS.usersManageLab] },
  { pattern: /^\/technicians(\/|$)/, permissions: [PERMS.view] },

  { pattern: /^\/users(\/|$)/, permissions: [PERMS.usersManageLab] },
  { pattern: /^\/roles(\/|$)/, permissions: [PERMS.rolesManageLab] },
  { pattern: /^\/invitations(\/|$)/, permissions: [PERMS.usersManageLab] },

  { pattern: /^\/analytes\/new$/, permissions: [PERMS.configEdit] },
  { pattern: /^\/analytes(\/|$)/, permissions: [PERMS.view] },

  { pattern: /^\/internal-standards\/new$/, permissions: [PERMS.configEdit] },
  { pattern: /^\/internal-standards(\/|$)/, permissions: [PERMS.view] },

  { pattern: /^\/calibration-levels\/new$/, permissions: [PERMS.configEdit] },
  { pattern: /^\/calibration-levels(\/|$)/, permissions: [PERMS.view] },

  { pattern: /^\/instruments\/new$/, permissions: [PERMS.configEdit] },
  { pattern: /^\/instruments(\/|$)/, permissions: [PERMS.view] },

  { pattern: /^\/method-configs\/new$/, permissions: [PERMS.configEdit] },
  { pattern: /^\/method-configs(\/|$)/, permissions: [PERMS.view] },

  { pattern: /^\/runs\/upload$/, permissions: [PERMS.runsUpload] },
  { pattern: /^\/runs(\/|$)/, permissions: [PERMS.view] },

  { pattern: /^\/calibration-groups(\/|$)/, permissions: [PERMS.view] },

  { pattern: /^\/api-docs(\/|$)/, permissions: [PERMS.view] },
  { pattern: /^\/developer(\/|$)/, permissions: [PERMS.platformManage] },

  { pattern: /^\/dashboard(\/|$)/ },
  { pattern: /^\/account(\/|$)/ },
];

export function resolveRoutePermissions(pathname: string): readonly string[] | null {
  for (const rule of ROUTE_RULES) {
    if (rule.pattern.test(pathname)) {
      return rule.permissions ?? null;
    }
  }
  // Unknown app routes — require at least view access.
  return [PERMS.view];
}

export function hasAnyPermission(
  userPermissions: readonly string[] | null | undefined,
  required: readonly string[],
): boolean {
  if (!required.length) return true;
  return required.some((p) => userPermissions?.includes(p));
}

/** Human-readable labels for demo / access-denied screens. */
export const PERMISSION_LABELS: Record<string, string> = {
  [PERMS.view]: "View laboratory data",
  [PERMS.usersManageLab]: "Manage lab users",
  [PERMS.rolesManageLab]: "Manage roles",
  [PERMS.configEdit]: "Edit lab configuration",
  [PERMS.runsUpload]: "Upload calibration runs",
  [PERMS.runsDelete]: "Delete calibration runs",
  [PERMS.groupsApprove]: "Regression QA review (debug & charts)",
  [PERMS.laboratoriesManage]: "Manage laboratory settings",
  [PERMS.laboratoriesCreate]: "Create laboratories",
  [PERMS.platformManage]: "Platform administration",
};
