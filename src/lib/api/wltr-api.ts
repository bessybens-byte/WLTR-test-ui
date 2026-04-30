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

/** Multipart form: Token, Password, ConfirmPassword (ASP.NET model binding). */
export async function acceptInviteRegister(form: FormData): Promise<void> {
  const res = await apiFetch(`Auth/accept-invite`, {
    method: "POST",
    body: form,
    skipAuth: true,
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

/** Per-analyte assembled X/Y/weight tables; after compute rows include diagnostics from stored points. */
export async function getCalibrationGroupRegressionInputs(
  groupId: string,
): Promise<Record<string, unknown>[]> {
  return apiJson(`calibration-groups/${groupId}/regression-inputs`);
}

/** Weighted regression for all analytes; **204** on success. Clears curves/points on recompute. Requires `perm.runs.upload`; group Draft or Computed. */
export async function computeCalibrationGroup(groupId: string): Promise<void> {
  const res = await apiFetch(`calibration-groups/${groupId}/compute`, { method: "POST" });
  if (!res.ok) throw await parseErrorResponse(res);
}

/** Full regression QA snapshot for one analyte after compute — requires **`perm.groups.approve`**. Platform operators must pass **`laboratoryId`**. */
export async function getCalibrationGroupRegressionDebug(
  groupId: string,
  analyteId: string,
  params?: { laboratoryId?: string },
): Promise<Record<string, unknown>> {
  return apiJson(
    `calibration-groups/${groupId}/analytes/${encodeURIComponent(analyteId)}/regression-debug`,
    { searchParams: params },
  );
}

/** Exclude a persisted calibration point (after compute); requires `perm.runs.upload`; group Draft or Computed. */
export async function excludeCalibrationPoint(
  groupId: string,
  pointId: string,
  body: { reason: number; note: string },
): Promise<void> {
  const res = await apiFetch(
    `calibration-groups/${groupId}/points/${encodeURIComponent(pointId)}/exclude`,
    { method: "POST", body: JSON.stringify(body) },
  );
  if (!res.ok) throw await parseErrorResponse(res);
}

/** Re-include a previously excluded calibration point. */
export async function reinstateCalibrationPoint(groupId: string, pointId: string): Promise<void> {
  const res = await apiFetch(
    `calibration-groups/${groupId}/points/${encodeURIComponent(pointId)}/exclude`,
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
}): Promise<Paged<Record<string, unknown>>> {
  return apiJson(`instruments`, { searchParams: params });
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
