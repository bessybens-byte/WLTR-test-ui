"use client";

import { Card } from "@/components/ui";
import { ApiError } from "@/lib/api/errors";
import { getCalibrationGroupSummaryReport } from "@/lib/api/wltr-api";
import { CalibrationGroupStatus, type MeResponse } from "@/lib/types/wltr";
import {
  calStatusBadge,
  cell,
  fmtNum,
  passFailBadge,
} from "@/components/report-format-utils";
import { useQuery } from "@tanstack/react-query";

function AdminTable({ admin }: { readonly admin: Record<string, unknown> }) {
  const rows: { label: string; value: string }[] = [
    { label: "Method config name", value: cell(admin.methodConfigName) },
    { label: "Computed at", value: cell(admin.computedAt) },
    { label: "Computation version", value: cell(admin.computationVersion) },
    { label: "Target %RSD limit", value: fmtNum(admin.rsdPercentLimit, 2) },
    { label: "IS/surrogate %RSD limit", value: fmtNum(admin.isRsdPercentLimit, 2) },
    { label: "ICV vs true limit (%)", value: fmtNum(admin.icvLimitPercent, 2) },
    { label: "ICV CDS parity (%)", value: fmtNum(admin.icvCdsParityPercent, 4) },
    { label: "Soil dilution factor", value: fmtNum(admin.soilDilutionFactor, 4) },
    { label: "Aqueous dilution factor", value: fmtNum(admin.aqueousDilutionFactor, 4) },
    {
      label: "Computation stale",
      value: admin.isComputationStale ? "Yes" : "No",
    },
  ];

  return (
    <dl className="grid gap-2 text-sm sm:grid-cols-2">
      {rows.map((r) => (
        <div key={r.label}>
          <dt className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{r.label}</dt>
          <dd className="mt-0.5 font-mono text-xs">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CalibrationGroupSummaryReportPanel({
  groupId,
  groupStatus,
  me,
}: {
  readonly groupId: string;
  readonly groupStatus: number;
  readonly me: MeResponse | null | undefined;
}) {
  const canLoad = groupStatus >= CalibrationGroupStatus.Computed;

  const report = useQuery({
    queryKey: ["calibration-group-summary-report", groupId, me?.laboratoryId ?? ""],
    queryFn: () =>
      getCalibrationGroupSummaryReport(groupId, me?.laboratoryId ? { laboratoryId: me.laboratoryId } : undefined),
    enabled: canLoad,
    retry: false,
  });

  if (!canLoad) {
    return (
      <Card>
        <div className="text-sm font-medium">Summary report</div>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Available after regression compute.
        </p>
      </Card>
    );
  }

  const data = report.data as Record<string, unknown> | undefined;
  const admin = (data?.administrative ?? {}) as Record<string, unknown>;
  const executive = Array.isArray(data?.executive) ? (data!.executive as Record<string, unknown>[]) : [];
  const responseFactors = Array.isArray(data?.responseFactors)
    ? (data!.responseFactors as Record<string, unknown>[])
    : [];
  const ldr = Array.isArray(data?.linearDynamicRange)
    ? (data!.linearDynamicRange as Record<string, unknown>[])
    : [];

  return (
    <Card>
      <div>
        <div className="text-sm font-medium">Summary report</div>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Four-table ICAL report built from each analyte&apos;s selected model — frozen snapshot thresholds at compute
          time.
        </p>
      </div>

      {report.isLoading ? <div className="mt-4 text-sm text-neutral-500">Loading summary report…</div> : null}
      {report.isError ? (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
          {report.error instanceof ApiError && report.error.status === 409
            ? "Select a model for each analyte on the report card before the summary report becomes available."
            : (report.error as Error).message}
        </p>
      ) : null}

      {report.isSuccess && data ? (
        <div className="mt-6 space-y-8">
          <section>
            <h3 className="mb-3 text-sm font-semibold">1. Administrative summary</h3>
            <AdminTable admin={admin} />
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold">2. Executive summary</h3>
            {executive.length === 0 ? (
              <p className="text-sm text-neutral-500">No analytes in report.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                      <th className="py-2 pr-2">Analyte</th>
                      <th className="py-2 pr-2">Status</th>
                      <th className="py-2 pr-2">R²</th>
                      <th className="py-2 pr-2">r</th>
                      <th className="py-2 pr-2">RSE</th>
                      <th className="py-2 pr-2">RF mean</th>
                      <th className="py-2 pr-2">RF %RSD</th>
                      <th className="py-2 pr-2">ICV</th>
                      <th className="py-2 pr-2">ICV CDS</th>
                      <th className="py-2 pr-2">ICV/LCS</th>
                      <th className="py-2 pr-2">SPCC RF</th>
                      <th className="py-2 pr-2">CCC RSD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executive.map((row) => {
                      const id = String(row.analyteId ?? row.analyteName ?? Math.random());
                      const failures = Array.isArray(row.failureReasons)
                        ? (row.failureReasons as string[]).join("; ")
                        : "";
                      return (
                        <tr key={id} className="border-b border-neutral-100 dark:border-neutral-900">
                          <td className="py-2 pr-2">
                            <div>{cell(row.analyteName)}</div>
                            {failures ? (
                              <div className="mt-0.5 text-[10px] text-red-700 dark:text-red-300">{failures}</div>
                            ) : null}
                          </td>
                          <td className="py-2 pr-2">{calStatusBadge(row.calStatus)}</td>
                          <td className="py-2 pr-2 font-mono">{fmtNum(row.rSquared)}</td>
                          <td className="py-2 pr-2 font-mono">{fmtNum(row.correlationR)}</td>
                          <td className="py-2 pr-2 font-mono">{fmtNum(row.rse)}</td>
                          <td className="py-2 pr-2 font-mono">{fmtNum(row.meanResponseFactor)}</td>
                          <td className="py-2 pr-2 font-mono">{fmtNum(row.responseFactorRsd, 2)}</td>
                          <td className="py-2 pr-2">{passFailBadge(row.icvPassed)}</td>
                          <td className="py-2 pr-2">{passFailBadge(row.icvCdsPassed)}</td>
                          <td className="py-2 pr-2">{passFailBadge(row.icvLcsRecoveryPassed)}</td>
                          <td className="py-2 pr-2">{passFailBadge(row.spccMinRfPassed)}</td>
                          <td className="py-2 pr-2">{passFailBadge(row.cccRsdPassed)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold">3. Response factor summary</h3>
            {responseFactors.length === 0 ? (
              <p className="text-sm text-neutral-500">No response factor data.</p>
            ) : (
              <div className="space-y-4">
                {responseFactors.map((analyte) => {
                  const points = Array.isArray(analyte.points)
                    ? (analyte.points as Record<string, unknown>[])
                    : [];
                  return (
                    <div
                      key={String(analyte.analyteId ?? analyte.analyteName)}
                      className="rounded-lg border border-neutral-200 dark:border-neutral-800"
                    >
                      <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs dark:border-neutral-800 dark:bg-neutral-900/50">
                        <span className="font-medium">{cell(analyte.analyteName)}</span>
                        <span className="ml-3 text-neutral-600 dark:text-neutral-400">
                          Mean RF: {fmtNum(analyte.meanResponseFactor)} · %RSD:{" "}
                          {fmtNum(analyte.responseFactorRsd, 2)}
                        </span>
                      </div>
                      {points.length ? (
                        <div className="overflow-x-auto p-2">
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr className="text-left text-neutral-600 dark:text-neutral-400">
                                <th className="py-1 pr-2">X</th>
                                <th className="py-1 pr-2">Y</th>
                                <th className="py-1 pr-2">RF</th>
                                <th className="py-1 pr-2">Included</th>
                              </tr>
                            </thead>
                            <tbody>
                              {points.map((p, i) => (
                                <tr key={i} className="border-t border-neutral-100 dark:border-neutral-900">
                                  <td className="py-1 pr-2 font-mono">{fmtNum(p.x)}</td>
                                  <td className="py-1 pr-2 font-mono">{fmtNum(p.y)}</td>
                                  <td className="py-1 pr-2 font-mono">{fmtNum(p.responseFactor)}</td>
                                  <td className="py-1 pr-2">{p.isIncluded ? "Yes" : "No"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold">4. Linear dynamic range</h3>
            {ldr.length === 0 ? (
              <p className="text-sm text-neutral-500">No LDR data.</p>
            ) : (
              <div className="space-y-4">
                {ldr.map((analyte) => {
                  const points = Array.isArray(analyte.points)
                    ? (analyte.points as Record<string, unknown>[])
                    : [];
                  return (
                    <div
                      key={String(analyte.analyteId ?? analyte.analyteName)}
                      className="rounded-lg border border-neutral-200 dark:border-neutral-800"
                    >
                      <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs dark:border-neutral-800 dark:bg-neutral-900/50">
                        <span className="font-medium">{cell(analyte.analyteName)}</span>
                        <span className="ml-3 font-mono text-neutral-600 dark:text-neutral-400">
                          slope={fmtNum(analyte.slope)} intercept={fmtNum(analyte.intercept)}
                        </span>
                        {analyte.icvTrueConcentration != null ? (
                          <span className="ml-3 text-neutral-600 dark:text-neutral-400">
                            ICV true={fmtNum(analyte.icvTrueConcentration)} calc=
                            {fmtNum(analyte.icvCalculatedConcentration)} %Diff=
                            {fmtNum(analyte.icvPercentDiff, 2)} CDS %Diff=
                            {fmtNum(analyte.icvCdsPercentDiff, 4)}{" "}
                            {passFailBadge(analyte.icvPassed)} / CDS {passFailBadge(analyte.icvCdsPassed)}
                          </span>
                        ) : null}
                      </div>
                      {points.length ? (
                        <div className="overflow-x-auto p-2">
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr className="text-left text-neutral-600 dark:text-neutral-400">
                                <th className="py-1 pr-2">X</th>
                                <th className="py-1 pr-2">Y</th>
                                <th className="py-1 pr-2">Predicted Y</th>
                                <th className="py-1 pr-2">Residual</th>
                                <th className="py-1 pr-2">%Diff</th>
                                <th className="py-1 pr-2">Incl.</th>
                                <th className="py-1 pr-2">Accept</th>
                              </tr>
                            </thead>
                            <tbody>
                              {points.map((p, i) => (
                                <tr key={i} className="border-t border-neutral-100 dark:border-neutral-900">
                                  <td className="py-1 pr-2 font-mono">{fmtNum(p.x)}</td>
                                  <td className="py-1 pr-2 font-mono">{fmtNum(p.y)}</td>
                                  <td className="py-1 pr-2 font-mono">{fmtNum(p.predictedY)}</td>
                                  <td className="py-1 pr-2 font-mono">{fmtNum(p.residual)}</td>
                                  <td className="py-1 pr-2 font-mono">{fmtNum(p.percentDiff, 2)}</td>
                                  <td className="py-1 pr-2">{p.isIncluded ? "Yes" : "No"}</td>
                                  <td className="py-1 pr-2">{p.acceptance === 1 ? "OK" : p.acceptance === 0 ? "No" : "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </Card>
  );
}
