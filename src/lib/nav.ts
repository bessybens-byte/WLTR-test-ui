import { PERMS } from "@/lib/types/wltr";

export type NavItem = {
  href: string;
  label: string;
  /** If set, user must have this permission (or SuperAdmin-style broad access via platform). */
  perm?: string;
};

export const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/laboratories", label: "Laboratories", perm: PERMS.view },
  { href: "/technicians", label: "Technicians", perm: PERMS.view },
  { href: "/users", label: "Users", perm: PERMS.usersManageLab },
  { href: "/roles", label: "Roles", perm: PERMS.rolesManageLab },
  { href: "/invitations", label: "Invitations", perm: PERMS.usersManageLab },
  { href: "/analytes", label: "Analytes", perm: PERMS.view },
  { href: "/internal-standards", label: "Internal standards", perm: PERMS.view },
  { href: "/calibration-levels", label: "Calibration levels", perm: PERMS.view },
  { href: "/instruments", label: "Instruments", perm: PERMS.view },
  { href: "/method-configs", label: "Method configs", perm: PERMS.view },
  { href: "/runs", label: "Runs", perm: PERMS.view },
  { href: "/calibration-groups", label: "Calibration groups", perm: PERMS.view },
  { href: "/account", label: "Account" },
  { href: "/developer", label: "API explorer" },
];

export function canSeeNavItem(perms: string[] | null | undefined, item: NavItem): boolean {
  if (!item.perm) return true;
  return !!perms?.includes(item.perm);
}
