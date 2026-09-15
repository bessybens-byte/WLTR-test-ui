"use client";

import { IcvCalculatorTable } from "@/components/icv-calculator-table";
import { ApiError } from "@/lib/api/errors";
import { getCalibrationGroupAnalyteCurves } from "@/lib/api/wltr-api";
import { buildIcvReportContext, getIcvField } from "@/lib/icv-calculator";
import { variantKey } from "@/lib/regression-wire";
import { useQuery } from "@tanstack/react-query";

export function IcvCalculatorForAnalyte({
  groupId,
  analyteId,
  laboratoryId,
  report,
  showLegend = true,
}: {
  readonly groupId: string;
  readonly analyteId: string;
  readonly laboratoryId?: string;
  readonly report: Record<string, unknown> | null | undefined;
  readonly showLegend?: boolean;
}) {
  const reportContext = buildIcvReportContext(report, analyteId);
  const highlightVariantKey = (() => {
    const exec = reportContext?.executive;
    if (!exec) return null;
    return variantKey(
      getIcvField(exec, "selectedRegressionType", "SelectedRegressionType"),
      getIcvField(exec, "selectedWeightingMode", "SelectedWeightingMode"),
    );
  })();

  const curvesQ = useQuery({
    queryKey: ["calibration-group-analyte-curves", groupId, analyteId, laboratoryId ?? ""],
    queryFn: () =>
      getCalibrationGroupAnalyteCurves(
        groupId,
        analyteId,
        laboratoryId ? { laboratoryId } : undefined,
      ),
    enabled: !!groupId && !!analyteId,
    retry: false,
  });

  if (curvesQ.isLoading) {
    return <p className="text-xs text-neutral-500">Loading ICV calculator…</p>;
  }

  if (curvesQ.isError) {
    const msg = curvesQ.error instanceof Error ? curvesQ.error.message : "Failed to load curves";
    const needsApprove =
      curvesQ.error instanceof ApiError && (curvesQ.error.status === 401 || curvesQ.error.status === 403);
    return (
      <p className="text-xs text-neutral-500">
        {needsApprove
          ? "ICV model grid requires perm.groups.approve to load all variants."
          : msg}
      </p>
    );
  }

  const curveRows = (Array.isArray(curvesQ.data) ? curvesQ.data : []).filter(
    (c): c is Record<string, unknown> => typeof c === "object" && c !== null,
  );

  const referenceCurve =
    highlightVariantKey != null
      ? (curveRows.find(
          (c) =>
            variantKey(
              getIcvField(c, "regressionType", "RegressionType"),
              getIcvField(c, "weightingMode", "WeightingMode"),
            ) === highlightVariantKey,
        ) ?? curveRows[0] ?? null)
      : (curveRows[0] ?? null);

  return (
    <IcvCalculatorTable
      curves={curveRows}
      highlightVariantKey={highlightVariantKey}
      referenceCurve={referenceCurve}
      reportContext={reportContext}
      showLegend={showLegend}
    />
  );
}
