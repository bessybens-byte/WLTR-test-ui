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
import { useMemo, useState } from "react";

function ReportCardRankingLegend() {
  const [showTechnical, setShowTechnical] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-lime-200/80 bg-gradient-to-br from-lime-50 via-white to-emerald-50/40 shadow-sm dark:border-lime-900/50 dark:from-lime-950/30 dark:via-neutral-950 dark:to-emerald-950/20">
      {/* Quick read — always visible */}
      <div className="border-b border-lime-200/60 px-4 py-3 dark:border-lime-900/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">How to pick a model</p>
            <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
              Like golf: <span className="font-semibold text-emerald-700 dark:text-emerald-400">fewer points wins</span>.
              Rank <span className="font-mono font-semibold">1</span> is best.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[10px] font-medium shadow-sm ring-1 ring-neutral-200/80 dark:bg-neutral-900/80 dark:ring-neutral-700">
            <span className={`rounded px-1.5 py-0.5 font-mono font-bold ${rankCellClass(1)}`}>1</span>
            <span className="text-neutral-400">→</span>
            <span className={`rounded px-1.5 py-0.5 font-mono font-bold ${rankCellClass(9)}`}>9</span>
            <span className="ml-1 text-neutral-500">best → worst</span>
          </div>
        </div>
      </div>

      {/* Three-step story */}
      <div className="grid gap-px bg-lime-200/50 sm:grid-cols-3 dark:bg-lime-900/30">
        <div className="bg-white/90 px-4 py-3 dark:bg-neutral-950/90">
          <div className="text-[10px] font-bold uppercase tracking-wide text-lime-700 dark:text-lime-400">1 · Compare</div>
          <p className="mt-1 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
            Nine calibration curves per analyte — Average RF, least-squares, quadratic, each with different weighting.
          </p>
        </div>
        <div className="bg-white/90 px-4 py-3 dark:bg-neutral-950/90">
          <div className="text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">2 · Score</div>
          <p className="mt-1 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
            Each curve earns penalty points for cal failures, bad refits, shaky low-level extrapolation, negative
            concentrations, and ICV miss.
          </p>
        </div>
        <div className="bg-white/90 px-4 py-3 dark:bg-neutral-950/90">
          <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">3 · Choose</div>
          <p className="mt-1 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
            Lowest <strong>Point total</strong> wins. Footer shows the recommended pick — blue overall, red if you need
            a non-forced-zero model.
          </p>
        </div>
      </div>

      {/* What feeds the score */}
      <div className="px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          What adds penalty points
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            { label: "Didn't pass cal", tone: "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200" },
            { label: "Points outside %Diff band", tone: "bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-200" },
            { label: "Low cal extrapolation", tone: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200" },
            { label: "Negative back-calc", tone: "bg-yellow-100 text-yellow-900 dark:bg-yellow-950/50 dark:text-yellow-200" },
            { label: "ICV recovery", tone: "bg-lime-100 text-lime-900 dark:bg-lime-950/50 dark:text-lime-200" },
          ].map((chip) => (
            <span
              key={chip.label}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${chip.tone}`}
            >
              {chip.label}
            </span>
          ))}
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            + relative rank vs other models
          </span>
        </div>
      </div>

      {/* Column guide + footer */}
      <div className="grid gap-3 border-t border-lime-200/60 px-4 py-3 sm:grid-cols-2 dark:border-lime-900/40">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Reading the columns</p>
          <ul className="mt-1.5 space-y-1 text-xs text-neutral-700 dark:text-neutral-300">
            <li>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">Fit quality</span> — RSD from{" "}
              <code className="font-mono">rsdPassGate</code> (Average RF only); r/COD from{" "}
              <code className="font-mono">correlationRGrade</code> / <code className="font-mono">codGrade</code>
            </li>
            <li>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">ReFitting check</span> — raw point
              counts, not ranks
            </li>
            <li>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">Low cal probes / ICV</span> — ranked
              1–9; greener is better
            </li>
            <li>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">Point total</span> — the bottom
              line; add up the penalties
            </li>
            <li>
              <span className="text-neutral-500">—</span> means that variant could not be ranked (missing probe data)
            </li>
          </ul>
        </div>
        <div className="rounded-lg bg-white/70 px-3 py-2 ring-1 ring-neutral-200/60 dark:bg-neutral-900/50 dark:ring-neutral-700">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Table footer</p>
          <div className="mt-2 space-y-1.5 text-xs">
            <p>
              <span className="font-semibold text-blue-800 dark:text-blue-300">Blue</span> — best overall model (can
              be forced-zero)
            </p>
            <p>
              <span className="font-semibold text-red-800 dark:text-red-300">Red</span> — best model that does{" "}
              <em>not</em> force through zero
            </p>
          </div>
        </div>
      </div>

      {/* Technical appendix — opt-in */}
      <div className="border-t border-lime-200/60 px-4 py-2 dark:border-lime-900/40">
        <button
          type="button"
          onClick={() => setShowTechnical((v) => !v)}
          className="text-[11px] font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          {showTechnical ? "▾ Hide" : "▸ Show"} API & workbook details
        </button>
        {showTechnical ? (
          <div className="mt-2 space-y-2 pb-2 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
            <p>
              Group variants sort by <code className="font-mono">reportCardScore</code> (pass-count across analytes);
              top variant gets <code className="font-mono">isSuggestedModel</code>.
            </p>
            <p className="rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5 font-mono text-[10px] dark:border-neutral-700 dark:bg-neutral-900">
              pointTotal = passGate + belowBound + aboveBound + failTotal×2 + probeRanks + overallDev + negArea +
              icvRank
            </p>
            <p>
              RSD column uses <code className="font-mono">rankingBreakdown.rsdPassGate</code> only (1 → A+, 100 → F);
              blank on non–Average-RF rows. Do not use <code className="font-mono">rse</code> or{" "}
              <code className="font-mono">passGate</code> for that cell.
            </p>
            <p>
              # &lt; −20% PE, # &gt; +20% PE, and Total # come straight from{" "}
              <code className="font-mono">pointsBelowLowerBound</code>, <code className="font-mono">pointsAboveUpperBound</code>,{" "}
              <code className="font-mono">failTotalDoubleCounted</code> — these are raw counts baked into the Point
              Total sum, not a rank vs sibling models.
            </p>
            <p>
              <span className="font-mono">w/o forced 0</span> shows{" "}
              <code className="font-mono">nonForcedZeroPointTotal</code>; <span className="font-mono">w/ forced 0</span>{" "}
              shows <code className="font-mono">nonForcedZeroModelRank</code>. Both are blank on the two forced-zero
              rows.
            </p>
            <p>
              Forced-zero models compete fully in the overall Point Total — blank point total means unranked, not
              excluded. Picker cells read <code className="font-mono">analyteRecommendations[].recommendedModelLabel</code>{" "}
              / <code className="font-mono">nonForcedZeroModelLabel</code>, overridden by{" "}
              <code className="font-mono">cautionText</code> for quadratic inverse-weighted picks.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

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

function GradeCell({ grade, title }: { grade: string; title?: string }) {
  return (
    <td
      title={title}
      className={`border border-neutral-300 px-1 py-0.5 text-center text-[11px] dark:border-neutral-700 ${gradeCellClass(grade)}`}
    >
      {grade}
    </td>
  );
}

/** Plain numeric cell for raw counts (BF/BG/BH) — not a rank, so no traffic-light coloring. */
function CountCell({ value }: { value: number | null }) {
  return (
    <td className="border border-neutral-300 px-1 py-0.5 text-center font-mono text-[11px] dark:border-neutral-700">
      {value ?? "—"}
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
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">{table.columnLabels.rsd}</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">{table.columnLabels.r}</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">{table.columnLabels.cod}</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700"># &lt; −20% PE</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700"># &gt; +20% PE</th>
            <th className="border border-neutral-300 px-1 py-1 dark:border-neutral-700">Total #</th>
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
                <GradeCell
                  grade={m.rsdGrade}
                  title={row.analyte?.responseFactorRsd != null ? `RF %RSD ${row.analyte.responseFactorRsd.toFixed(2)}` : undefined}
                />
                <GradeCell
                  grade={m.rGrade}
                  title={row.analyte?.correlationR != null ? `r ${row.analyte.correlationR.toFixed(4)}` : undefined}
                />
                <GradeCell
                  grade={m.codGrade}
                  title={row.analyte?.rSquared != null ? `COD ${row.analyte.rSquared.toFixed(4)}` : undefined}
                />
                <CountCell value={m.pointsBelowLowerBound} />
                <CountCell value={m.pointsAboveUpperBound} />
                <CountCell value={m.failTotalDoubleCounted} />
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
                <CountCell value={m.nonForcedZeroPointTotal} />
                <RankCell rank={m.nonForcedZeroModelRank} />
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
                  <span className="font-semibold text-blue-700 dark:text-blue-300">{table.bestOverallLabel ?? "—"}</span>
                  {table.bestOverallCaution ? (
                    <span className="ml-1 text-amber-700 dark:text-amber-400">⚠ {table.bestOverallCaution}</span>
                  ) : null}
                </span>
                <span>
                  <span className="font-semibold text-red-800 dark:text-red-200">Best ranked non-forced 0 calibration model:</span>{" "}
                  <span className="font-semibold text-red-700 dark:text-red-300">{table.bestNonForcedZeroLabel ?? "—"}</span>
                  {table.bestNonForcedZeroCaution ? (
                    <span className="ml-1 text-amber-700 dark:text-amber-400">⚠ {table.bestNonForcedZeroCaution}</span>
                  ) : null}
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
      <ReportCardRankingLegend />

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
