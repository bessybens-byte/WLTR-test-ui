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
  /** Fourth `RunStatus` member in newer API snapshots; verify label against live Swagger/domain. */
  Unknown: 3,
} as const;
export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];

/** Match `Wltr.Domain.Enums.RegressionType`; weighting is separate (`WeightingMode`). */
export const RegressionType = {
  Linear: 0,
  Quadratic: 1,
  Average: 2,
  /** Backend-specific / reserved fourth member — confirm naming in Swagger. */
  Type3: 3,
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
  3: "Unknown",
};

export const RUN_TYPE_LABEL: Record<number, string> = {
  0: "CAL",
  1: "ICV",
};

/** Display strings for method config `defaultRegressionType` / snapshot `regressionType` integers. */
export const REGRESSION_TYPE_LABEL: Record<number, string> = {
  0: "Linear",
  1: "Quadratic",
  2: "Average",
  3: "Type 3",
};

export const GROUP_STATUS_LABEL: Record<number, string> = {
  0: "Draft",
  1: "Computed",
  2: "Approved",
  3: "Rejected",
};

/** `Wltr.Domain.Enums.ExclusionReason` (JSON integers). Manual POST body accepts 1 or 2 only. */
export const ExclusionReason = {
  None: 0,
  ManualExclude: 1,
  PctDiffOutOfRange: 2,
  MissingRatio: 3,
  MissingIS: 4,
  InvalidX: 5,
} as const;
export type ExclusionReason = (typeof ExclusionReason)[keyof typeof ExclusionReason];

export const EXCLUSION_REASON_LABEL: Record<number, string> = {
  0: "None",
  1: "Manual exclude",
  2: "% diff out of range",
  3: "Missing ratio",
  4: "Missing IS",
  5: "Invalid X",
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
