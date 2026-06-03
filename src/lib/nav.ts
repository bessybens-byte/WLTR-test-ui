import { PERMS } from "@/lib/types/wltr";

export type NavItem = {
  href: string;
  label: string;
  description?: string;
  /** If set, user must have this permission. */
  perm?: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

/** Sidebar navigation grouped for client demos. */
export const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", description: "Your account and system status" },
      { href: "/account", label: "My profile", description: "Update your technician profile" },
    ],
  },
  {
    title: "Laboratory",
    items: [
      { href: "/laboratories", label: "Laboratories", perm: PERMS.view },
      { href: "/technicians", label: "Technicians", perm: PERMS.view },
      { href: "/users", label: "Users", perm: PERMS.usersManageLab },
      { href: "/roles", label: "Roles", perm: PERMS.rolesManageLab },
      { href: "/invitations", label: "Invitations", perm: PERMS.usersManageLab },
    ],
  },
  {
    title: "Configuration",
    items: [
      { href: "/analytes", label: "Analytes", perm: PERMS.view },
      { href: "/internal-standards", label: "Internal standards", perm: PERMS.view },
      { href: "/calibration-levels", label: "Calibration levels", perm: PERMS.view },
      { href: "/instruments", label: "Instruments", perm: PERMS.view },
      { href: "/method-configs", label: "Method configs", perm: PERMS.view },
    ],
  },
  {
    title: "Calibration workflow",
    items: [
      { href: "/runs", label: "Runs", perm: PERMS.view },
      { href: "/calibration-groups", label: "Calibration groups", perm: PERMS.view },
    ],
  },
  {
    title: "Reference",
    items: [
      { href: "/api-docs", label: "API guide", description: "Authentication, permissions, and workflows", perm: PERMS.view },
      { href: "/developer", label: "API explorer", description: "Try endpoints live", perm: PERMS.platformManage },
    ],
  },
];

/** Flat list for quick-link lookups. */
export const mainNav: NavItem[] = navSections.flatMap((s) => s.items);

export function canSeeNavItem(perms: string[] | null | undefined, item: NavItem): boolean {
  if (!item.perm) return true;
  return !!perms?.includes(item.perm);
}
