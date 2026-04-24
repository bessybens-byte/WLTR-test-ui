/** Mirrors WLTR domain enums as sent on the wire (numeric). */

export const RunType = {
  CAL: 0,
  ICV: 1,
} as const;
export type RunType = (typeof RunType)[keyof typeof RunType];

export const RunStatus = {
  Valid: 0,
  ValidWithWarnings: 1,
  Invalid: 2,
} as const;
export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];

export const RegressionType = {
  Linear: 0,
  Quadratic: 1,
  WeightedLinear: 2,
  WeightedQuadratic: 3,
} as const;

/** API integers: 0 = None, 1 = InverseX (1/X), 2 = InverseXSquared (1/X²). */
export const WeightingMode = {
  None: 0,
  InverseX: 1,
  InverseXSquared: 2,
} as const;

export const LabelMode = {
  Absolute: 0,
  Relative: 1,
} as const;

export const AnalyteMappingApplyScope = {
  RunOnly: 0,
  Laboratory: 1,
} as const;

/** 0=Draft, 1=Computed, 2=Approved, 3=Rejected */
export const CalibrationGroupStatus = {
  Draft: 0,
  Computed: 1,
  Approved: 2,
  Rejected: 3,
} as const;
export type CalibrationGroupStatus = (typeof CalibrationGroupStatus)[keyof typeof CalibrationGroupStatus];

export const RUN_STATUS_LABEL: Record<number, string> = {
  0: "Valid",
  1: "Valid with warnings",
  2: "Invalid",
};

export const RUN_TYPE_LABEL: Record<number, string> = {
  0: "CAL",
  1: "ICV",
};

export const GROUP_STATUS_LABEL: Record<number, string> = {
  0: "Draft",
  1: "Computed",
  2: "Approved",
  3: "Rejected",
};

export type MeResponse = {
  userId?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  laboratoryId?: string | null;
  qualifications?: string | null;
  hireDate?: string | null;
  roleNames?: string[] | null;
  permissions?: string[] | null;
  rowVersion?: string | null;
};

export type LoginResponse = {
  accessToken?: string | null;
  refreshToken?: string | null;
  accessTokenExpiresAtUtc?: string;
};

export type Paged<T> = {
  items?: T[] | null;
  totalCount: number;
  page: number;
  pageSize: number;
};

export const PERMS = {
  view: "perm.view",
  usersManageLab: "perm.users.manage_lab",
  rolesManageLab: "perm.roles.manage_lab",
  configEdit: "perm.config.edit",
  runsUpload: "perm.runs.upload",
  runsDelete: "perm.runs.delete",
  groupsApprove: "perm.groups.approve",
  laboratoriesManage: "perm.laboratories.manage",
  laboratoriesCreate: "perm.laboratories.create",
  platformManage: "perm.platform.manage",
} as const;

export function hasPermission(me: MeResponse | null | undefined, p: string): boolean {
  return !!me?.permissions?.includes(p);
}
