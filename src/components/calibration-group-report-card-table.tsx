"use client";

import { Callout, Select } from "@/components/ui";
import {
  buildReportCardTables,
  gradeCellClass,
  rankCellClass,
  type MethodGradeThresholds,
  type ReportCardAnalyteTable,
  type ReportCardModelRow,
} from "@/lib/report-card-excel";
import { modelVariantLabel } from "@/lib/regression-wire";
import { useMemo, useState } from "react";

function RankCell({ rank }: { rank: number | null }) {
  if (rank == null) {
    return (
      <td className="border border-neutral-300 bg-neutral-100 px-1 py-0.5 text-center text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900">
        —
      </td>
    );
  }
  return (
    <td
      className={`border border-neutral-300 px-1 py-0.5 text-center font-mono text-[11px] font-semibold dark:border-neutral-700 ${rankCellClass(rank)}`}
    >
      {rank}
    </td>
  );
}

function GradeCell({ grade }: { grade: string }) {
  return (
    <td
      className={`border border-neutral-300 px-1 py-0.5 text-center text-[11px] dark:border-neutral-700 ${gradeCellClass(grade)}`}
    >
      {grade}
    </td>
  );
}

function AnalyteReportCardTable({
  table,
  selectedVariantKey,
  canSelect,
  onSelectModel,
  selectBusy,
}: {
  table: ReportCardAnalyteTable;
  selectedVariantKey: string | null;
  canSelect: boolean;
  onSelectModel: (row: ReportCardModelRow) => void;
  selectBusy: boolean;
}) {
  const bestOverall = table.rows.find((r) => r.key === table.bestOverallKey);
  const bestNonForced = table.rows.find((r) => r.key === table.bestNonForcedZeroKey);

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-300 dark:border-neutral-700">
      <table className="w-full min-w-[960px] border-collapse text-[11px]">
        <thead>
          <tr className="bg-lime-200 text-neutral-900 dark:bg-lime-950/50 dark:text-lime-100">
            <th colSpan={canSelect ? 21 : 20} className="border border-neutral-300 px-2 py-1 text-left text-sm font-bold dark:border-neutral-700">
              Report Card — <span className="text-red-700 dark:text-red-300">{table.analyteName}</span>
            </th>
          </tr>
          <tr className="bg-neutral-100 text-[10px] dark:bg-neutral-900">
            <th rowSpan={2} className="border border-neutral-300 px-2 py-1 text-left align-bottom dark:border-neutral-700">
              Calibration model
            </th>
            <th colSpan={3} className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">
              Fit quality
            </th>
            <th colSpan={3} className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">
              ReFitting check
            </th>
            <th colSpan={6} className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">
              0 to ½ low cal check
            </th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">neg</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">ICV</th>
            <th colSpan={4} className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">
              Pt Totals
            </th>
            {canSelect ? (
              <th rowSpan={2} className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">
                Select
              </th>
            ) : null}
          </tr>
          <tr className="bg-neutral-50 text-[9px] dark:bg-neutral-950">
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">RSD</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">r</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">COD</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">&gt; −20% PE</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">&lt; +20% PE</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">Total</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">Zero</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">12.5%</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">25%</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">50%</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">75%</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">Overall</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">neg rank</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">ICV rank</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">Point total</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">Rank</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">w/o forced 0</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">w/ forced 0</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => {
            const m = row.metrics;
            const isSelected = selectedVariantKey === row.key || row.analyte?.isSelected === true;
            return (
              <tr key={row.key} className={isSelected ? "ring-2 ring-inset ring-emerald-500" : undefined}>
                <td className={`border border-neutral-300 px-2 py-1 font-semibold dark:border-neutral-700 ${row.rowClass}`}>
                  {row.excelLabel}
                </td>
                <GradeCell grade={m.rsdGrade} />
                <GradeCell grade={m.rGrade} />
                <GradeCell grade={m.codGrade} />
                <RankCell rank={m.refittingGreaterThanMinus20PeRank} />
                <RankCell rank={m.refittingLessThanPlus20PeRank} />
                <RankCell rank={m.refittingTotalRank} />
                <RankCell rank={m.zeroAreaRank} />
                <RankCell rank={m.cal125PercentRank} />
                <RankCell rank={m.cal25PercentRank} />
                <RankCell rank={m.cal50PercentRank} />
                <RankCell rank={m.cal75PercentRank} />
                <RankCell rank={m.overallExtrapolationRank} />
                <RankCell rank={m.negativeAreaRank} />
                <RankCell rank={m.icvRank} />
                <td
                  className={`border border-neutral-300 px-1 py-0.5 text-center font-mono font-semibold dark:border-neutral-700 ${rankCellClass(m.pointTotalRank)}`}
                >
                  {m.pointTotal ?? "—"}
                </td>
                <RankCell rank={m.pointTotalRank} />
                <RankCell rank={m.pointTotalWithoutForcedZeroRank} />
                <RankCell rank={m.pointTotalWithForcedZeroRank} />
                {canSelect ? (
                  <td className="border border-neutral-300 px-1 py-0.5 text-center dark:border-neutral-700">
                    {isSelected ? (
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">✓</span>
                    ) : row.analyte && row.regressionType && row.weightingMode ? (
                      <button
                        type="button"
                        disabled={selectBusy}
                        onClick={() => onSelectModel(row)}
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:text-blue-300 dark:hover:bg-blue-950/40"
                      >
                        Select
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-lime-100 dark:bg-lime-950/30">
            <td colSpan={canSelect ? 21 : 20} className="border border-neutral-300 px-2 py-2 dark:border-neutral-700">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px]">
                <span>
                  <span className="font-semibold text-blue-800 dark:text-blue-200">Best overall ranked calibration model:</span>{" "}
                  <span className="font-semibold text-blue-700 dark:text-blue-300">
                    {bestOverall?.excelLabel ?? "—"}
                  </span>
                  {bestOverall?.regressionType && bestOverall.weightingMode ? (
                    <span className="ml-1 text-neutral-500">
                      ({modelVariantLabel(bestOverall.regressionType, bestOverall.weightingMode)})
                    </span>
                  ) : null}
                </span>
                <span>
                  <span className="font-semibold text-red-800 dark:text-red-200">Best ranked non-forced 0 calibration model:</span>{" "}
                  <span className="font-semibold text-red-700 dark:text-red-300">
                    {bestNonForced?.excelLabel ?? "—"}
                  </span>
                </span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function CalibrationGroupReportCardTable({
  reportCard,
  thresholds,
  selectedByAnalyte,
  canSelect,
  onSelectModel,
  selectBusy,
}: {
  reportCard: Record<string, unknown> | undefined;
  thresholds?: MethodGradeThresholds;
  selectedByAnalyte: Map<string, string>;
  canSelect: boolean;
  onSelectModel: (analyteId: string, regressionType: string, weightingMode: string) => void;
  selectBusy: boolean;
}) {
  const tables = useMemo(() => buildReportCardTables(reportCard, thresholds), [reportCard, thresholds]);
  const [analyteId, setAnalyteId] = useState("");

  const activeId = analyteId || tables[0]?.analyteId || "";
  const activeTable = tables.find((t) => t.analyteId === activeId) ?? tables[0];
  const anyFull = tables.some((t) => t.hasFullDvdMetrics);

  if (!tables.length) {
    return <p className="text-sm text-neutral-500">No analyte variants yet — run regression first.</p>;
  }

  return (
    <div className="space-y-4">
      {!anyFull ? (
        <Callout tone="info" title="Using available report-card metrics">
          The table reads DVD ranking columns from the API when present (Point Total, refitting PE ranks, extrapolation
          probes, ICV rank). Missing cells fall back to computed grades/ranks from the legacy variant payload. Refresh
          after compute if you recently upgraded the API.
        </Callout>
      ) : null}

      {tables.length > 1 ? (
        <div className="max-w-md">
          <label htmlFor="rcAnalyte" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Analyte
          </label>
          <Select id="rcAnalyte" className="mt-1" value={activeId} onChange={(e) => setAnalyteId(e.target.value)}>
            {tables.map((t) => (
              <option key={t.analyteId} value={t.analyteId}>
                {t.analyteName}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {activeTable ? (
        <AnalyteReportCardTable
          table={activeTable}
          selectedVariantKey={selectedByAnalyte.get(activeTable.analyteId) ?? null}
          canSelect={canSelect}
          selectBusy={selectBusy}
          onSelectModel={(row) => {
            if (!row.analyte || !row.regressionType || !row.weightingMode) return;
            onSelectModel(row.analyte.analyteId, row.regressionType, row.weightingMode);
          }}
        />
      ) : null}
    </div>
  );
}
