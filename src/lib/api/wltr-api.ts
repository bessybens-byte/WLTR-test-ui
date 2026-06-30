import { apiFetch, apiJson } from "@/lib/api/client";
import { parseErrorResponse } from "@/lib/api/errors";
import type { MeResponse, Paged } from "@/lib/types/wltr";

export async function healthRoot(): Promise<string> {
  const res = await apiFetch("", { method: "GET" });
  if (!res.ok) throw await parseErrorResponse(res);
  return await res.text();
}

export async function getMe(): Promise<MeResponse> {
  return apiJson<MeResponse>("Auth/me");
}

export async function putMe(body: unknown): Promise<void> {
  const res = await apiFetch("Auth/me", { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function listLaboratories(params?: {
  page?: number;
  pageSize?: number;
  sort?: string;
}): Promise<Paged<Record<string, unknown>>> {
  return apiJson(`Laboratories`, { searchParams: params });
}

export async function getLaboratory(id: string): Promise<Record<string, unknown>> {
  return apiJson(`Laboratories/${id}`);
}

export async function createLaboratory(body: unknown): Promise<Record<string, unknown>> {
  return apiJson(`Laboratories`, { method: "POST", body: JSON.stringify(body) });
}

export async function updateLaboratory(id: string, body: unknown): Promise<void> {
  const res = await apiFetch(`Laboratories/${id}`, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function listTechnicians(params?: {
  page?: number;
  pageSize?: number;
  sort?: string;
}): Promise<Paged<Record<string, unknown>>> {
  return apiJson(`LabTechnicians`, { searchParams: params });
}

export async function getTechnician(id: string): Promise<Record<string, unknown>> {
  return apiJson(`LabTechnicians/${id}`);
}

export async function getTechnicianMe(): Promise<Record<string, unknown>> {
  return apiJson(`LabTechnicians/me`);
}

export async function createTechnician(body: unknown): Promise<Record<string, unknown>> {
  return apiJson(`LabTechnicians`, { method: "POST", body: JSON.stringify(body) });
}

export async function updateTechnician(id: string, body: unknown): Promise<void> {
  const res = await apiFetch(`LabTechnicians/${id}`, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function listUsers(params?: {
  page?: number;
  pageSize?: number;
  sort?: string;
  laboratoryId?: string;
}): Promise<Paged<Record<string, unknown>>> {
  return apiJson(`Users`, { searchParams: params });
}

export async function deactivateUser(userId: string, laboratoryId?: string): Promise<void> {
  const res = await apiFetch(`Users/${encodeURIComponent(userId)}/deactivate`, {
    method: "PUT",
    searchParams: laboratoryId ? { laboratoryId } : undefined,
  });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function reactivateUser(userId: string, laboratoryId?: string): Promise<void> {
  const res = await apiFetch(`Users/${encodeURIComponent(userId)}/reactivate`, {
    method: "PUT",
    searchParams: laboratoryId ? { laboratoryId } : undefined,
  });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function listRoles(params?: {
  page?: number;
  pageSize?: number;
  sort?: string;
  laboratoryId?: string;
}): Promise<Paged<Record<string, unknown>>> {
  return apiJson(`Roles`, { searchParams: params });
}

/** Paginate role list until `roleId` is found (API has no GET /Roles/{id}). */
export async function findRoleById(
  roleId: string,
  params?: { laboratoryId?: string },
): Promise<Record<string, unknown> | null> {
  const decoded = decodeURIComponent(roleId);
  let page = 1;
  const pageSize = 100;
  for (;;) {
    const res = await listRoles({
      page,
      pageSize,
      sort: "name:asc",
      laboratoryId: params?.laboratoryId,
    });
    const items = res.items ?? [];
    const hit = items.find((r) => String((r as Record<string, unknown>).roleId) === decoded);
    if (hit) return hit as Record<string, unknown>;
    if (page * pageSize >= res.totalCount) return null;
    page += 1;
  }
}

export async function login(body: { email: string; password: string }): Promise<Record<string, unknown>> {
  return apiJson(`Auth/login`, { method: "POST", body: JSON.stringify(body), skipAuth: true });
}

export async function refreshSession(body: { refreshToken: string }): Promise<Record<string, unknown>> {
  return apiJson(`Auth/refresh`, { method: "POST", body: JSON.stringify(body), skipAuth: true });
}

export async function logoutSession(body: { refreshToken: string }): Promise<void> {
  const res = await apiFetch(`Auth/logout`, {
    method: "POST",
    body: JSON.stringify(body),
    skipAuth: true,
  });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function forgotPassword(body: { email: string }): Promise<void> {
  const res = await apiFetch(`Auth/forgot-password`, {
    method: "POST",
    body: JSON.stringify(body),
    skipAuth: true,
  });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function resetPassword(body: {
  userId: string;
  token: string;
  newPassword: string;
}): Promise<void> {
  const res = await apiFetch(`Auth/reset-password`, {
    method: "POST",
    body: JSON.stringify(body),
    skipAuth: true,
  });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function changePassword(body: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const res = await apiFetch(`Auth/change-password`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function createRole(body: unknown): Promise<Record<string, unknown>> {
  return apiJson(`Roles`, { method: "POST", body: JSON.stringify(body) });
}

export async function renameRole(roleId: string, body: unknown): Promise<void> {
  const res = await apiFetch(`Roles/${encodeURIComponent(roleId)}/name`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function updateRolePermissions(roleId: string, body: unknown): Promise<void> {
  const res = await apiFetch(`Roles/${encodeURIComponent(roleId)}/permissions`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function deleteRole(roleId: string, laboratoryId?: string): Promise<void> {
  const res = await apiFetch(`Roles/${encodeURIComponent(roleId)}`, {
    method: "DELETE",
    searchParams: laboratoryId ? { laboratoryId } : undefined,
  });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function assignRoles(body: unknown): Promise<void> {
  const res = await apiFetch(`Roles/assignments`, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function removeRoles(body: unknown): Promise<void> {
  const res = await apiFetch(`Roles/assignments`, { method: "DELETE", body: JSON.stringify(body) });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function createInvitation(body: unknown): Promise<Record<string, unknown>> {
  return apiJson(`Invitations`, { method: "POST", body: JSON.stringify(body) });
}

/** Body matches OpenAPI `AcceptInviteRequest` (`token`, `password` only). */
export async function acceptInviteRegister(payload: { token: string; password: string }): Promise<void> {
  const res = await apiFetch(`Auth/accept-invite`, {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({
      token: payload.token,
      password: payload.password,
    }),
  });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function listAnalytes(params?: {
  page?: number;
  pageSize?: number;
  sort?: string;
}): Promise<Paged<Record<string, unknown>>> {
  return apiJson(`analytes`, { searchParams: params });
}

export async function suggestionsAnalytes(rawName?: string, top?: number): Promise<Record<string, unknown>[]> {
  return apiJson(`analytes/suggestions`, { searchParams: { rawName, top } });
}

export async function unresolvedAnalytes(): Promise<Record<string, unknown>[]> {
  return apiJson(`analytes/unresolved`);
}

export async function getAnalyte(id: string): Promise<Record<string, unknown>> {
  return apiJson(`analytes/${id}`);
}

export async function createAnalyte(body: unknown): Promise<Record<string, unknown>> {
  return apiJson(`analytes`, { method: "POST", body: JSON.stringify(body) });
}

export async function updateAnalyte(id: string, body: unknown): Promise<void> {
  const res = await apiFetch(`analytes/${id}`, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function deleteAnalyte(id: string): Promise<void> {
  const res = await apiFetch(`analytes/${id}`, { method: "DELETE" });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function createAnalyteAlias(analyteId: string, body: unknown): Promise<Record<string, unknown>> {
  return apiJson(`analytes/${analyteId}/aliases`, { method: "POST", body: JSON.stringify(body) });
}

export async function updateAnalyteAlias(aliasId: string, body: unknown): Promise<void> {
  const res = await apiFetch(`analytes/aliases/${aliasId}`, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function deleteAnalyteAlias(aliasId: string): Promise<void> {
  const res = await apiFetch(`analytes/aliases/${aliasId}`, { method: "DELETE" });
  if (!res.ok) throw await parseErrorResponse(res);
}

/** Bare JSON array (sorted by name), not the paged envelope. */
export async function listInternalStandards(): Promise<Record<string, unknown>[]> {
  return apiJson(`internal-standards`);
}

export async function getInternalStandard(id: string): Promise<Record<string, unknown>> {
  return apiJson(`internal-standards/${id}`);
}

export async function createInternalStandard(body: unknown): Promise<Record<string, unknown>> {
  return apiJson(`internal-standards`, { method: "POST", body: JSON.stringify(body) });
}

export async function updateInternalStandard(id: string, body: unknown): Promise<void> {
  const res = await apiFetch(`internal-standards/${id}`, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function deleteInternalStandard(id: string): Promise<void> {
  const res = await apiFetch(`internal-standards/${id}`, { method: "DELETE" });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function listCalibrationLevels(params?: {
  page?: number;
  pageSize?: number;
  sort?: string;
}): Promise<Paged<Record<string, unknown>>> {
  return apiJson(`calibration-levels`, { searchParams: params });
}

export async function getCalibrationLevel(id: string): Promise<Record<string, unknown>> {
  return apiJson(`calibration-levels/${id}`);
}

export async function createCalibrationLevel(body: unknown): Promise<Record<string, unknown>> {
  return apiJson(`calibration-levels`, { method: "POST", body: JSON.stringify(body) });
}

export async function updateCalibrationLevel(id: string, body: unknown): Promise<void> {
  const res = await apiFetch(`calibration-levels/${id}`, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function deleteCalibrationLevel(id: string): Promise<void> {
  const res = await apiFetch(`calibration-levels/${id}`, { method: "DELETE" });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function createInstrument(body: unknown): Promise<Record<string, unknown>> {
  return apiJson(`instruments`, { method: "POST", body: JSON.stringify(body) });
}

export async function listMethodConfigs(params?: {
  page?: number;
  pageSize?: number;
  sort?: string;
}): Promise<Paged<Record<string, unknown>>> {
  return apiJson(`method-configs`, { searchParams: params });
}

export async function getMethodConfig(id: string): Promise<Record<string, unknown>> {
  return apiJson(`method-configs/${id}`);
}

export async function createMethodConfig(body: unknown): Promise<Record<string, unknown>> {
  return apiJson(`method-configs`, { method: "POST", body: JSON.stringify(body) });
}

export async function updateMethodConfig(id: string, body: unknown): Promise<{ currentVersion?: number }> {
  return apiJson(`method-configs/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export async function deleteMethodConfig(id: string): Promise<void> {
  const res = await apiFetch(`method-configs/${id}`, { method: "DELETE" });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function listMethodConfigSnapshots(
  id: string,
  params?: { page?: number; pageSize?: number },
): Promise<Paged<Record<string, unknown>>> {
  return apiJson(`method-configs/${id}/snapshots`, { searchParams: params });
}

export async function getMethodConfigSnapshot(id: string, version: number): Promise<Record<string, unknown>> {
  return apiJson(`method-configs/${id}/snapshots/${version}`);
}

export async function createRun(body: unknown): Promise<Record<string, unknown>> {
  return apiJson(`runs`, { method: "POST", body: JSON.stringify(body) });
}

export async function getRun(id: string): Promise<Record<string, unknown>> {
  return apiJson(`runs/${id}`);
}

/** Soft-delete when the run is not linked to any calibration group; **409** if still in a group. Requires `perm.runs.delete`. */
export async function deleteRun(id: string): Promise<void> {
  const res = await apiFetch(`runs/${id}`, { method: "DELETE" });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function getRunMeasurements(id: string): Promise<Record<string, unknown>[]> {
  return apiJson(`runs/${id}/measurements`);
}

export async function getRunValidation(id: string): Promise<Record<string, unknown>> {
  return apiJson(`runs/${id}/validation`);
}

/** JSON array; optional `methodConfigId` for threshold flags. Platform operators must pass `laboratoryId`. */
export async function getRunInternalStandardSummaries(
  runId: string,
  params?: { laboratoryId?: string; methodConfigId?: string },
): Promise<Record<string, unknown>[]> {
  return apiJson(`runs/${runId}/internal-standard-summaries`, { searchParams: params });
}

export async function getCalibrationGroupInternalStandardSummaries(
  groupId: string,
  params?: { laboratoryId?: string; methodConfigId?: string },
): Promise<Record<string, unknown>[]> {
  return apiJson(`calibration-groups/${groupId}/internal-standard-summaries`, { searchParams: params });
}

/** Draft group from CAL runs + optional ICV; requires `perm.runs.upload` and lab technician profile. */
export async function createCalibrationGroup(body: unknown): Promise<Record<string, unknown>> {
  return apiJson(`calibration-groups`, { method: "POST", body: JSON.stringify(body) });
}

/** Pre-compute readiness for linked CAL runs (ICV not evaluated). Platform operators must pass `laboratoryId`. */
export async function getCalibrationGroupReadiness(
  groupId: string,
  params?: { laboratoryId?: string },
): Promise<Record<string, unknown>> {
  return apiJson(`calibration-groups/${groupId}/readiness`, { searchParams: params });
}

export type CalibrationCurveQueryParams = {
  laboratoryId?: string;
  regressionType?: string;
  weightingMode?: string;
};

/** Per-analyte assembled X/Y/weight tables; after compute rows include diagnostics from stored points. Platform operators should pass **`laboratoryId`**. Optional **`regressionType`** / **`weightingMode`** select a computed variant. */
export async function getCalibrationGroupRegressionInputs(
  groupId: string,
  params?: CalibrationCurveQueryParams,
): Promise<Record<string, unknown>[]> {
  return apiJson(`calibration-groups/${groupId}/regression-inputs`, { searchParams: params });
}

/** Weighted regression for all analytes. Requires `perm.runs.upload`. Returns **204** on success. Platform operators should pass `laboratoryId` when the JWT has no laboratory claim. */
export async function computeCalibrationGroup(
  groupId: string,
  params?: { laboratoryId?: string },
): Promise<void> {
  const res = await apiFetch(`calibration-groups/${groupId}/compute`, {
    method: "POST",
    body: JSON.stringify({}),
    searchParams: params,
  });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function listExcludedGroupAnalytes(groupId: string): Promise<Record<string, unknown>[]> {
  return apiJson(`calibration-groups/${groupId}/excluded-analytes`);
}

/**
 * Returns distinct resolved target analytes from a group's CAL runs, each annotated with its
 * current exclusion state (`isExcluded`). Only `Target`-category rows with a resolved analyte
 * are included; IS compound rows are omitted. Results are sorted by analyte name ascending.
 * Works for all group statuses. Requires `perm.view`.
 */
export async function listTargetGroupAnalytes(
  groupId: string,
  params?: { laboratoryId?: string },
): Promise<Record<string, unknown>[]> {
  return apiJson(`calibration-groups/${groupId}/target-analytes`, { searchParams: params });
}

export async function excludeGroupAnalyte(groupId: string, body: unknown): Promise<void> {
  const res = await apiFetch(`calibration-groups/${groupId}/excluded-analytes`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function removeExcludedGroupAnalyte(groupId: string, analyteId: string): Promise<void> {
  const res = await apiFetch(
    `calibration-groups/${groupId}/excluded-analytes/${encodeURIComponent(analyteId)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw await parseErrorResponse(res);
}

/** Replace the group's full analyte exclusion list in one request (empty array clears all). */
export async function replaceExcludedGroupAnalytes(groupId: string, body: unknown): Promise<void> {
  const res = await apiFetch(`calibration-groups/${groupId}/excluded-analytes`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseErrorResponse(res);
}

/** Multi-variant model comparison after compute — ranks variants by pass-count. Requires `perm.view`. Platform operators must pass `laboratoryId`. */
export async function getCalibrationGroupReportCard(
  groupId: string,
  params?: { laboratoryId?: string },
): Promise<Record<string, unknown>> {
  return apiJson(`calibration-groups/${groupId}/report-card`, { searchParams: params });
}

/** Four-table Summary Report for the selected regression model. Requires `perm.view`. Returns **409** when no model is selected. */
export async function getCalibrationGroupSummaryReport(
  groupId: string,
  params?: { laboratoryId?: string },
): Promise<Record<string, unknown>> {
  return apiJson(`calibration-groups/${groupId}/report`, { searchParams: params });
}

/** Per-analyte acceptance limits configured on a method. Requires `perm.config.edit` for writes. */
export async function listMethodAnalyteCriteria(methodConfigId: string): Promise<Record<string, unknown>[]> {
  return apiJson(`method-configs/${methodConfigId}/analyte-criteria`);
}

export async function replaceMethodAnalyteCriteria(methodConfigId: string, body: unknown): Promise<void> {
  const res = await apiFetch(`method-configs/${methodConfigId}/analyte-criteria`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseErrorResponse(res);
}

/** Persist the analyst's chosen regression variant for one analyte. Requires `perm.runs.upload`. */
export async function selectCalibrationGroupModel(
  groupId: string,
  analyteId: string,
  body: { regressionType: string; weightingMode: string },
): Promise<void> {
  const res = await apiFetch(
    `calibration-groups/${encodeURIComponent(groupId)}/analytes/${encodeURIComponent(analyteId)}/select-model`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw await parseErrorResponse(res);
}

/** Lock an approved calibration group for reporting. Requires `perm.groups.approve`. */
export async function approveCalibrationGroup(
  groupId: string,
  body?: { comment?: string },
): Promise<void> {
  const res = await apiFetch(`calibration-groups/${groupId}/approve`, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw await parseErrorResponse(res);
}

/** Terminal rejection of a computed group. Requires `perm.groups.approve`. */
export async function rejectCalibrationGroup(
  groupId: string,
  body?: { comment?: string },
): Promise<void> {
  const res = await apiFetch(`calibration-groups/${groupId}/reject`, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function listSuppressedInstrumentAnalytes(instrumentId: string): Promise<Record<string, unknown>[]> {
  return apiJson(`instruments/${instrumentId}/suppressed-analytes`);
}

export async function suppressInstrumentAnalyte(instrumentId: string, body: unknown): Promise<void> {
  const res = await apiFetch(`instruments/${instrumentId}/suppressed-analytes`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function removeSuppressedInstrumentAnalyte(
  instrumentId: string,
  analyteId: string,
): Promise<void> {
  const res = await apiFetch(
    `instruments/${instrumentId}/suppressed-analytes/${encodeURIComponent(analyteId)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function updateInstrument(id: string, body: unknown): Promise<void> {
  const res = await apiFetch(`instruments/${id}`, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function deleteInstrument(id: string): Promise<void> {
  const res = await apiFetch(`instruments/${id}`, { method: "DELETE" });
  if (!res.ok) throw await parseErrorResponse(res);
}

export async function getUser(
  userId: string,
  params?: { laboratoryId?: string },
): Promise<Record<string, unknown>> {
  return apiJson(`Users/${encodeURIComponent(userId)}`, { searchParams: params });
}

/** Full regression QA snapshot for one analyte after compute — requires **`perm.groups.approve`**. Platform operators must pass **`laboratoryId`**. Optional **`regressionType`** / **`weightingMode`** select a computed variant. */
export async function getCalibrationGroupRegressionDebug(
  groupId: string,
  analyteId: string,
  params?: CalibrationCurveQueryParams,
): Promise<Record<string, unknown>> {
  return apiJson(
    `calibration-groups/${groupId}/analytes/${encodeURIComponent(analyteId)}/regression-debug`,
    { searchParams: params },
  );
}

/** All computed `(RegressionType, WeightingMode)` variants for one analyte — same shape as regression-debug per element. Requires **`perm.groups.approve`**. */
export async function getCalibrationGroupAnalyteCurves(
  groupId: string,
  analyteId: string,
  params?: CalibrationCurveQueryParams,
): Promise<Record<string, unknown>[]> {
  return apiJson(
    `calibration-groups/${groupId}/analytes/${encodeURIComponent(analyteId)}/curves`,
    { searchParams: params },
  );
}

/** Plotly figure (`data`, `layout`, `config`). Requires **`perm.view`** and a **computed** group. Platform operators must pass **`laboratoryId`**. Optional **`regressionType`** / **`weightingMode`** select a computed variant. */
export async function getCalibrationGroupChart(
  groupId: string,
  analyteId: string,
  params?: CalibrationCurveQueryParams,
): Promise<{ data?: unknown; layout?: unknown; config?: unknown } & Record<string, unknown>> {
  return apiJson(`calibration-groups/${groupId}/analytes/${encodeURIComponent(analyteId)}/chart`, {
    searchParams: params,
  });
}

export async function listCalibrationPointExclusions(
  groupId: string,
): Promise<Record<string, unknown>[]> {
  return apiJson(`calibration-groups/${groupId}/point-exclusions`);
}

/** Exclude a measurement (analyte + CAL run) from regression; requires `perm.runs.upload`. */
export async function excludeCalibrationPoint(
  groupId: string,
  body: { analyteId: string; calRunId: string; reason: string; note: string },
): Promise<void> {
  const res = await apiFetch(`calibration-groups/${groupId}/point-exclusions`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseErrorResponse(res);
}

/** Re-include a previously excluded measurement. */
export async function reinstateCalibrationPoint(
  groupId: string,
  analyteId: string,
  calRunId: string,
): Promise<void> {
  const res = await apiFetch(
    `calibration-groups/${groupId}/point-exclusions/${encodeURIComponent(analyteId)}/${encodeURIComponent(calRunId)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw await parseErrorResponse(res);
}

/**
 * Triggers a browser download of UTF-8 CSV (`format=csv`). Call only from client event handlers.
 */
export async function downloadInternalStandardSummariesCsv(
  variant: "run" | "calibrationGroup",
  id: string,
  params?: { laboratoryId?: string; methodConfigId?: string },
): Promise<void> {
  const path =
    variant === "run"
      ? `runs/${id}/internal-standard-summaries`
      : `calibration-groups/${id}/internal-standard-summaries`;
  const res = await apiFetch(path, {
    searchParams: { ...params, format: "csv" },
  });
  if (!res.ok) throw await parseErrorResponse(res);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    variant === "run" ? `is-summaries-run-${id}.csv` : `is-summaries-calibration-group-${id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function resolveAnalyteMapping(runId: string, body: unknown): Promise<Record<string, unknown>> {
  return apiJson(`runs/${runId}/analyte-mapping/resolve`, { method: "POST", body: JSON.stringify(body) });
}

export async function listInstruments(params?: {
  page?: number;
  pageSize?: number;
  sort?: string;
  isActive?: boolean;
  instrumentType?: string;
}): Promise<Paged<Record<string, unknown>>> {
  const searchParams: Record<string, string | number | undefined> = {
    page: params?.page,
    pageSize: params?.pageSize,
    sort: params?.sort,
    instrumentType: params?.instrumentType,
  };
  if (params?.isActive !== undefined) searchParams.isActive = String(params.isActive);
  return apiJson(`instruments`, { searchParams });
}

export async function getInstrument(id: string): Promise<Record<string, unknown>> {
  return apiJson(`instruments/${id}`);
}

export async function listRuns(params?: {
  instrumentId?: string;
  runType?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
}): Promise<Paged<Record<string, unknown>>> {
  return apiJson(`runs`, { searchParams: params });
}

export async function listCalibrationGroups(params?: {
  laboratoryId?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
}): Promise<Paged<Record<string, unknown>>> {
  return apiJson(`calibration-groups`, { searchParams: params });
}

export async function getCalibrationGroup(id: string): Promise<Record<string, unknown>> {
  return apiJson(`calibration-groups/${id}`);
}

export async function updateCalibrationGroup(id: string, body: unknown): Promise<void> {
  const res = await apiFetch(`calibration-groups/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseErrorResponse(res);
}

/** CAL and ICV run candidates with eligibility flags for a given instrument. */
export async function getCalibrationGroupCandidates(instrumentId: string): Promise<Record<string, unknown>> {
  return apiJson(`calibration-groups/candidates`, { searchParams: { instrumentId } });
}
