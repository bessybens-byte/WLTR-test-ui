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
  Average: 0,
  Linear: 1,
  LinearForcedZero: 2,
  Quadratic: 3,
} as const;

/** API integers: 0 = None, 1 = InverseX (1/X), 2 = InverseXSquared (1/X²). */
export const WeightingMode = {
  None: 0,
  InverseX: 1,
  InverseXSquared: 2,
} as const;

/** `Wltr.Domain.Enums.AnalyteRole` — QC role assigned to the analyte. */
export const AnalyteRole = {
  Target: 0,
  InternalStandard: 1,
  Surrogate: 2,
} as const;
export type AnalyteRole = (typeof AnalyteRole)[keyof typeof AnalyteRole];

export const ANALYTE_ROLE_LABEL: Record<number, string> = {
  0: "Target",
  1: "Internal standard",
  2: "Surrogate",
};

/** Method config `quantitationMode` — string enum as returned/accepted by the API. */
export const QuantitationMode = {
  InternalStandard: "InternalStandard",
  ExternalStandard: "ExternalStandard",
} as const;
export type QuantitationMode = (typeof QuantitationMode)[keyof typeof QuantitationMode];

export const QUANTITATION_MODE_LABEL: Record<string, string> = {
  InternalStandard: "Internal standard (ISTD)",
  ExternalStandard: "External standard (ESTD)",
};

/** Method config `labelMode` — string enum as returned/accepted by the API. */
export const LabelMode = {
  /** Display R² on charts. */
  RSquared: "RSquared",
  /** Display √R² (correlation coefficient r) on charts. */
  R: "R",
} as const;
export type LabelMode = (typeof LabelMode)[keyof typeof LabelMode];

export const LABEL_MODE_LABEL: Record<string, string> = {
  RSquared: "R²",
  R: "√R² (correlation r)",
};

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
  0: "Average",
  1: "Linear",
  2: "Linear (forced zero)",
  3: "Quadratic",
};

/** Per-variant weighting labels from API `WeightingMode`. */
export const WEIGHTING_MODE_LABEL: Record<number, string> = {
  0: "None",
  1: "1/x",
  2: "1/x²",
};

export const GROUP_STATUS_LABEL: Record<number, string> = {
  0: "Draft",
  1: "Computed",
  2: "Approved",
  3: "Rejected",
};

/** `Wltr.Domain.Enums.AnalyteCalStatus` — 0 Fail, 1 Pass. */
export const AnalyteCalStatus = {
  Fail: 0,
  Pass: 1,
} as const;

export const ANALYTE_CAL_STATUS_LABEL: Record<number, string> = {
  0: "Fail",
  1: "Pass",
};

/** `Wltr.Domain.Enums.CompoundCategory` as returned on measurement rows. */
export const CompoundCategory = {
  Target: 0,
  InternalStandard: 1,
  Unknown: 2,
  SystemMonitoringCompound: 3,
  Surrogate: 4,
} as const;

export const COMPOUND_CATEGORY_LABEL: Record<number, string> = {
  0: "Target",
  1: "Internal standard",
  2: "Unknown",
  3: "SMC",
  4: "Surrogate",
};

/** `Wltr.Domain.Enums.PointAcceptance` on calibration points. */
export const PointAcceptance = {
  Rejected: 0,
  Accepted: 1,
} as const;

export const POINT_ACCEPTANCE_LABEL: Record<number, string> = {
  0: "Rejected",
  1: "Accepted",
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

export function isPlatformOperator(me: MeResponse | null | undefined): boolean {
  return me != null && !me.laboratoryId;
}

export function displayName(me: MeResponse | null | undefined): string {
  const parts = [me?.firstName, me?.lastName].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return me?.email ?? "User";
}

/** Full permission catalog for role administration UIs (matches OpenAPI permissions reference). */
export const ALL_PERMISSIONS = [
  PERMS.view,
  PERMS.runsUpload,
  PERMS.runsDelete,
  PERMS.groupsApprove,
  PERMS.configEdit,
  PERMS.usersManageLab,
  PERMS.rolesManageLab,
  PERMS.laboratoriesManage,
  PERMS.laboratoriesCreate,
  PERMS.platformManage,
] as const;
