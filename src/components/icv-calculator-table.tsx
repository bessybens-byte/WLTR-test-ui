"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ExcelAnnotation } from "@/components/excel-annotation";
import {
  buildIcvModelGroups,
  excelCheckCell,
  fmtIcvNum,
  fmtIcvSci,
  hasIcvData,
  icvPassLabel,
  icvTriStateLabel,
  mergeIcvSnapshot,
  parseIcvAdminLimits,
  parseIcvInstrumentInputs,
  parseIcvSnapshot,
  pctDiffFromReference,
  selectedModelLabel,
  type IcvModelGroup,
  type IcvModelRow,
  type IcvReportContext,
} from "@/lib/icv-calculator";

function Td({
  className = "",
  children = null,
  colSpan = 1,
  rowSpan = 1,
}: {
  className?: string;
  children?: ReactNode;
  colSpan?: number;
  rowSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={`border border-neutral-400 px-1.5 py-0.5 dark:border-neutral-600 ${className}`}
    >
      {children}
    </td>
  );
}

function PassBadge({ passed, compact }: { passed: boolean | null; compact?: boolean }) {
  if (passed == null) {
    return <span className="text-neutral-400">{compact ? "N/A" : "Not configured"}</span>;
  }
  const tone = passed
    ? "bg-lime-100 text-lime-900 dark:bg-lime-950/50 dark:text-lime-100"
    : "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-100";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${tone}`}>
      {icvTriStateLabel(passed)}
    </span>
  );
}

function AcceptableCell({ passed }: { passed: boolean | null }) {
  const label = icvPassLabel(passed);
  const tone =
    passed === true
      ? "bg-lime-100 font-semibold text-lime-900 dark:bg-lime-950/50 dark:text-lime-100"
      : passed === false
        ? "bg-red-100 font-semibold text-red-900 dark:bg-red-950/50 dark:text-red-100"
        : "text-neutral-400";
  return <Td className={`text-center text-[11px] ${tone}`}>{label}</Td>;
}

function IcvCalculatorLegend({ admin }: { readonly admin?: Record<string, unknown> | null }) {
  const [showTechnical, setShowTechnical] = useState(false);
  const limits = parseIcvAdminLimits(admin);

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-pink-200/80 bg-gradient-to-br from-pink-50 via-white to-sky-50/40 shadow-sm dark:border-pink-900/50 dark:from-pink-950/30 dark:via-neutral-950 dark:to-sky-950/20">
      <div className="border-b border-pink-200/60 px-4 py-3 dark:border-pink-900/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">How ICV verification works</p>
            <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
              WLTR inverts the ICV peak area through each curve, then checks three things: vs known true, vs
              instrument CDS, and recovery inside LCL/UCL.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[10px] font-medium">
            <span className="rounded-full bg-lime-100 px-2 py-0.5 text-lime-900 dark:bg-lime-950/50 dark:text-lime-200">
              Pass
            </span>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-900 dark:bg-red-950/50 dark:text-red-200">
              Fail
            </span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
              N/A = not configured
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-px bg-pink-200/50 sm:grid-cols-3 dark:bg-pink-900/30">
        <div className="bg-white/90 px-4 py-3 dark:bg-neutral-950/90">
          <div className="text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-400">1 · Measure</div>
          <p className="mt-1 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
            ICV is a separately prepared standard. Its raw area becomes the Y-value fed into each regression model.
          </p>
        </div>
        <div className="bg-white/90 px-4 py-3 dark:bg-neutral-950/90">
          <div className="text-[10px] font-bold uppercase tracking-wide text-pink-700 dark:text-pink-400">2 · Invert</div>
          <p className="mt-1 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
            Each model back-calculates a concentration. <strong>Old Cal</strong> is the selected model — the baseline
            for the &quot;% Diff From Calculated&quot; column.
          </p>
        </div>
        <div className="bg-white/90 px-4 py-3 dark:bg-neutral-950/90">
          <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            3 · Judge
          </div>
          <p className="mt-1 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
            Pink rows gate sign-off: SPCC/CCC checks, recovery % between LCL/UCL, and pass/fail vs true &amp; CDS limits.
          </p>
        </div>
      </div>

      <div className="px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Three acceptance checks</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-medium text-sky-900 dark:bg-sky-950/50 dark:text-sky-200">
            vs true
            {limits.icvLimitPercent != null ? ` ±${fmtIcvNum(limits.icvLimitPercent, 1)}%` : ""}
          </span>
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-medium text-violet-900 dark:bg-violet-950/50 dark:text-violet-200">
            vs CDS
            {limits.icvCdsParityPercent != null ? ` ±${fmtIcvNum(limits.icvCdsParityPercent, 2)}%` : ""}
          </span>
          <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-[10px] font-medium text-pink-900 dark:bg-pink-950/50 dark:text-pink-200">
            recovery window (LCL → UCL)
          </span>
        </div>
      </div>

      <div className="grid gap-3 border-t border-pink-200/60 px-4 py-3 sm:grid-cols-2 dark:border-pink-900/40">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Reading the table</p>
          <ul className="mt-1.5 space-y-1 text-xs text-neutral-700 dark:text-neutral-300">
            <li>
              <span className="font-medium">Instrument block</span> — peak area, ratios, and CDS-reported concentration
            </li>
            <li>
              <span className="font-medium text-pink-800 dark:text-pink-300">Pink rows</span> — QC gates (0.000 = pass
              for SPCC/CCC)
            </li>
            <li>
              <span className="font-medium">Model grid</span> — all nine variants; highlighted row = active filter
            </li>
            <li>
              <span className="font-mono text-[10px]">100 + %Diff</span> = recovery % (100% is perfect)
            </li>
          </ul>
        </div>
        <div className="rounded-lg bg-white/70 px-3 py-2 ring-1 ring-neutral-200/60 dark:bg-neutral-900/50 dark:ring-neutral-700">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Data source</p>
          <p className="mt-1.5 text-xs text-neutral-700 dark:text-neutral-300">
            Headline ICV values come from{" "}
            <code className="rounded bg-neutral-100 px-1 font-mono text-[10px] dark:bg-neutral-800">GET …/report</code>{" "}
            (selected model). The nine-row grid compares all variants from{" "}
            <code className="rounded bg-neutral-100 px-1 font-mono text-[10px] dark:bg-neutral-800">GET …/curves</code>.
          </p>
        </div>
      </div>

      <div className="border-t border-pink-200/60 px-4 py-2 dark:border-pink-900/40">
        <button
          type="button"
          onClick={() => setShowTechnical((v) => !v)}
          className="text-[11px] font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          {showTechnical ? "▾ Hide" : "▸ Show"} field definitions
        </button>
        {showTechnical ? (
          <div className="mt-2 space-y-1.5 pb-2 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
            <p>
              <code className="font-mono">icvPercentDiff</code> = (calc − true) / true × 100 ·{" "}
              <code className="font-mono">icvRecoveryPercent</code> = 100 + %Diff
            </p>
            <p>
              <code className="font-mono">icvObservedResponse</code> = raw ICV area ·{" "}
              <code className="font-mono">icvCdsReportedConcentration</code> = instrument value for parity check
            </p>
            <p>
              Flag convention: <strong>true</strong> = configured &amp; passed · <strong>false</strong> = configured
              &amp; failed · <strong>null</strong> = not applicable
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ModelDataRow({
  row,
  oldCal,
  highlighted,
}: {
  row: IcvModelRow;
  oldCal: number | null;
  highlighted?: boolean;
}) {
  const snap = row.curve ? parseIcvSnapshot(row.curve) : null;
  const calc = snap?.calculatedConcentration ?? null;
  const pctDiff = snap?.percentDiff ?? null;
  const pctFromOld = pctDiffFromReference(calc, oldCal);

  return (
    <tr className={highlighted ? "outline outline-2 outline-emerald-500 -outline-offset-2" : undefined}>
      <Td className="text-right font-mono text-[10px] text-neutral-700 dark:text-neutral-300">
        {pctDiff == null ? "—" : `${fmtIcvNum(pctDiff, 1)}%`}
      </Td>
      <Td className={`font-medium ${row.rowClass}`}>{row.subLabel}</Td>
      <Td className="text-right font-mono">{fmtIcvNum(calc, 2)}</Td>
      <Td className="text-right font-mono">{pctFromOld == null ? "—" : `${fmtIcvNum(pctFromOld, 2)}%`}</Td>
    </tr>
  );
}

function ModelGroupBlock({
  group,
  icvConct,
  oldCal,
  highlightVariantKey,
  isFirstGroup,
}: {
  group: IcvModelGroup;
  icvConct: number | null;
  oldCal: number | null;
  highlightVariantKey?: string | null;
  isFirstGroup: boolean;
}) {
  return (
    <>
      <tr className={group.headerClass}>
        <Td className="text-[10px]" />
        {isFirstGroup ? (
          <Td rowSpan={12} className="align-middle text-center text-[10px] font-semibold">
            <div>ICV</div>
            <div>Conct</div>
            <div className="mt-1 font-mono text-sm">{fmtIcvNum(icvConct, 2)}</div>
          </Td>
        ) : null}
        <Td className="text-[10px] font-semibold italic">{group.title}</Td>
        <Td colSpan={2} className="text-[10px] italic opacity-90">
          {group.formula}
        </Td>
      </tr>
      {group.rows.map((row) => (
        <ModelDataRow
          key={row.key}
          row={row}
          oldCal={oldCal}
          highlighted={!!highlightVariantKey && row.key === highlightVariantKey}
        />
      ))}
    </>
  );
}

function MetricRow({
  label,
  value,
  badge,
  annotation,
}: {
  label: string;
  value: ReactNode;
  badge?: ReactNode;
  annotation?: string;
}) {
  return (
    <tr className="bg-white dark:bg-neutral-950">
      <Td className="font-medium text-neutral-600 dark:text-neutral-400">
        {label}
        {annotation ? (
          <span className="ml-1">
            <ExcelAnnotation fieldKey={annotation} compact />
          </span>
        ) : null}
      </Td>
      <Td colSpan={3} className="font-mono text-right">
        {value}
      </Td>
      {badge != null ? <Td className="text-center">{badge}</Td> : <Td />}
    </tr>
  );
}

export function IcvCalculatorTable({
  curves,
  highlightVariantKey,
  referenceCurve,
  reportContext,
  title = "ICV Calculator",
  showLegend = true,
}: {
  readonly curves: readonly Record<string, unknown>[];
  readonly highlightVariantKey?: string | null;
  readonly referenceCurve?: Record<string, unknown> | null;
  readonly reportContext?: IcvReportContext | null;
  readonly title?: string;
  readonly showLegend?: boolean;
}) {
  const ref = referenceCurve ?? curves[0] ?? null;
  const snapshot = mergeIcvSnapshot(ref, reportContext);
  const inputs = parseIcvInstrumentInputs(ref, snapshot.observedResponse);
  const groups = buildIcvModelGroups(curves);
  const icvConct = snapshot.trueConcentration;
  const oldCal = snapshot.calculatedConcentration;
  const analyteName = snapshot.analyteName || "—";
  const modelLabel = selectedModelLabel(reportContext?.executive ?? null);
  const admin = reportContext?.admin ?? null;

  if (!curves.length) {
    return <p className="text-sm text-neutral-500">No computed curves — run regression first.</p>;
  }

  if (!hasIcvData(snapshot)) {
    return (
      <div className="space-y-3">
        {showLegend ? <IcvCalculatorLegend admin={admin} /> : null}
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
          No ICV run linked for <strong>{analyteName}</strong>. Link an ICV run on the calibration group to populate
          this calculator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {showLegend ? <IcvCalculatorLegend admin={admin} /> : null}
      <div className="overflow-x-auto rounded-lg border border-neutral-400 dark:border-neutral-600">
        <table className="w-full min-w-[880px] border-collapse text-[11px]">
          <thead>
            <tr className="bg-lime-300 text-neutral-900 dark:bg-lime-800 dark:text-lime-50">
              <th
                colSpan={5}
                className="border border-neutral-400 px-3 py-2 text-center text-base font-bold dark:border-neutral-600"
              >
                {title}
              </th>
            </tr>
            <tr className="bg-lime-200 dark:bg-lime-900/60">
              <th colSpan={5} className="border border-neutral-400 px-3 py-1 text-center dark:border-neutral-600">
                <span className="font-bold text-red-700 dark:text-red-300">{analyteName}</span>
                {modelLabel ? (
                  <span className="ml-2 text-[10px] font-normal text-neutral-700 dark:text-neutral-300">
                    Selected model: {modelLabel}
                  </span>
                ) : null}
              </th>
            </tr>
            <tr className="bg-neutral-100 text-[10px] font-semibold dark:bg-neutral-900">
              <th className="border border-neutral-400 px-1.5 py-1 dark:border-neutral-600">Field</th>
              <th colSpan={3} className="border border-neutral-400 px-1.5 py-1 dark:border-neutral-600">
                Value
              </th>
              <th className="border border-neutral-400 px-1.5 py-1 dark:border-neutral-600">Status</th>
            </tr>
          </thead>
          <tbody>
            <MetricRow
              label='Calculated Concentration ("Old Cal")'
              annotation="summary.ldr.icvCalc"
              value={fmtIcvNum(oldCal, 2)}
            />
            <MetricRow
              label="ICV True Concentration"
              annotation="summary.ldr.icvTrue"
              value={fmtIcvNum(icvConct, 2)}
            />
            <MetricRow
              label="ICV % Difference from True"
              annotation="summary.ldr.icvPctDiff"
              value={snapshot.percentDiff == null ? "—" : `${fmtIcvNum(snapshot.percentDiff, 2)}%`}
              badge={<PassBadge passed={snapshot.icvPassed} />}
            />
            <MetricRow
              label="ICV Recovery %"
              value={snapshot.recoveryPercent == null ? "—" : `${fmtIcvNum(snapshot.recoveryPercent, 2)}%`}
            />
            <MetricRow label="Standard Response (ICV area)" value={fmtIcvNum(inputs.standardResponse, 0)} />
            <MetricRow label="Internal Standard Response" value={fmtIcvNum(inputs.isResponse, 0)} />
            <MetricRow label="Response Ratio (Y-Value)" value={fmtIcvSci(inputs.responseRatio)} />
            <MetricRow label="Amount Ratio (X-Value)" value={fmtIcvSci(inputs.amountRatio)} />
            <MetricRow label="Response Factor (Y × X)" value={fmtIcvSci(inputs.responseFactor)} />
            <MetricRow
              label="CDS Reported Concentration"
              value={fmtIcvNum(snapshot.cdsReportedConcentration, 2)}
            />
            <MetricRow
              label="CDS % Difference (Inst − Ext)"
              annotation="summary.ldr.icvCdsPctDiff"
              value={snapshot.cdsPercentDiff == null ? "—" : `${fmtIcvNum(snapshot.cdsPercentDiff, 4)}%`}
              badge={<PassBadge passed={snapshot.icvCdsPassed} />}
            />

            <tr className="bg-pink-100 dark:bg-pink-950/40">
              <Td className="font-semibold">SPCC Check</Td>
              <Td className="font-mono text-right">{excelCheckCell(snapshot.spccMinRfPassed)}</Td>
              <Td className="font-semibold">CCC Check</Td>
              <Td className="font-mono text-right">{excelCheckCell(snapshot.cccRsdPassed)}</Td>
              <Td className="text-center text-[10px] text-neutral-500">QC</Td>
            </tr>
            <tr className="bg-pink-100 dark:bg-pink-950/40">
              <Td className="font-semibold">ICV % Rev Limits (LL)</Td>
              <Td className="font-mono text-right">{fmtIcvNum(snapshot.lowerControlLimit, 1)}</Td>
              <Td colSpan={2} className="font-mono text-right">
                {fmtIcvNum(snapshot.recoveryPercent, 2)}
              </Td>
              <AcceptableCell passed={snapshot.recoveryPassed} />
            </tr>
            <tr className="bg-pink-100 dark:bg-pink-950/40">
              <Td className="font-semibold">ICV % Rev Limits (HL)</Td>
              <Td className="font-mono text-right">{fmtIcvNum(snapshot.upperControlLimit, 1)}</Td>
              <Td colSpan={2} className="text-neutral-400">
                —
              </Td>
              <AcceptableCell passed={snapshot.recoveryPassed} />
            </tr>

            <tr className="bg-neutral-100 text-[10px] font-semibold dark:bg-neutral-900">
              <Td>%Diff</Td>
              <Td>ICV Conct</Td>
              <Td>Model</Td>
              <Td>Calculated</Td>
              <Td>{'% Diff From "Calculated"'}</Td>
            </tr>

            {groups.map((group, gi) => (
              <ModelGroupBlock
                key={group.id}
                group={group}
                icvConct={icvConct}
                oldCal={oldCal}
                highlightVariantKey={highlightVariantKey}
                isFirstGroup={gi === 0}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-neutral-50 text-[10px] dark:bg-neutral-900">
              <td colSpan={5} className="border border-neutral-400 px-2 py-1.5 dark:border-neutral-600">
                <ExcelAnnotation fieldKey="analyteCriteria.icvLcsLowerControlLimit" compact />{" "}
                <ExcelAnnotation fieldKey="analyteCriteria.icvLcsUpperControlLimit" compact />
                <span className="ml-2 text-neutral-500">
                  Old Cal = selected model from summary report · LCL/UCL from frozen analyte criteria
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
