"use client";

import type { ReactNode } from "react";
import { ExcelAnnotation } from "@/components/excel-annotation";
import {
  buildIcvModelGroups,
  excelCheckCell,
  fmtIcvNum,
  fmtIcvSci,
  icvPassLabel,
  parseIcvInstrumentInputs,
  parseIcvSnapshot,
  pctDiffFromReference,
  type IcvModelGroup,
  type IcvModelRow,
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

export function IcvCalculatorTable({
  curves,
  highlightVariantKey,
  referenceCurve,
  title = "ICV Calculator",
}: {
  readonly curves: readonly Record<string, unknown>[];
  readonly highlightVariantKey?: string | null;
  readonly referenceCurve?: Record<string, unknown> | null;
  readonly title?: string;
}) {
  const ref = referenceCurve ?? curves[0] ?? null;
  const snapshot = parseIcvSnapshot(ref);
  const inputs = parseIcvInstrumentInputs(ref);
  const groups = buildIcvModelGroups(curves);
  const icvConct = snapshot.trueConcentration;
  const oldCal = snapshot.calculatedConcentration;
  const analyteName = snapshot.analyteName || "—";

  if (!curves.length) {
    return <p className="text-sm text-neutral-500">No computed curves — run regression first.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-400 dark:border-neutral-600">
      <table className="w-full min-w-[820px] border-collapse text-[11px]">
        <thead>
          <tr className="bg-lime-300 text-neutral-900 dark:bg-lime-800 dark:text-lime-50">
            <th colSpan={5} className="border border-neutral-400 px-3 py-2 text-center text-base font-bold dark:border-neutral-600">
              {title}
            </th>
          </tr>
          <tr className="bg-lime-200 dark:bg-lime-900/60">
            <th colSpan={5} className="border border-neutral-400 px-3 py-1 text-center dark:border-neutral-600">
              <span className="font-bold text-red-700 dark:text-red-300">{analyteName}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-white dark:bg-neutral-950">
            <Td className="font-medium text-neutral-600 dark:text-neutral-400">Calculated Concentration (Old Cal)</Td>
            <Td colSpan={4} className="font-mono text-right">
              {fmtIcvNum(oldCal, 2)}
            </Td>
          </tr>
          <tr className="bg-white dark:bg-neutral-950">
            <Td className="font-medium">Standard Response</Td>
            <Td colSpan={4} className="font-mono text-right">
              {fmtIcvNum(inputs.standardResponse, 0)}
            </Td>
          </tr>
          <tr className="bg-white dark:bg-neutral-950">
            <Td className="font-medium">Internal Standard Response</Td>
            <Td colSpan={4} className="font-mono text-right">
              {fmtIcvNum(inputs.isResponse, 0)}
            </Td>
          </tr>
          <tr className="bg-white dark:bg-neutral-950">
            <Td className="font-medium">Response Ratio (Y-Value)</Td>
            <Td colSpan={4} className="font-mono text-right">
              {fmtIcvSci(inputs.responseRatio)}
            </Td>
          </tr>
          <tr className="bg-white dark:bg-neutral-950">
            <Td className="font-medium">Amount Ratio (X-Value)</Td>
            <Td colSpan={4} className="font-mono text-right">
              {fmtIcvSci(inputs.amountRatio)}
            </Td>
          </tr>
          <tr className="bg-white dark:bg-neutral-950">
            <Td className="font-medium">Response Factor (Y × X)</Td>
            <Td colSpan={4} className="font-mono text-right">
              {fmtIcvSci(inputs.responseFactor)}
            </Td>
          </tr>

          <tr className="bg-pink-100 dark:bg-pink-950/40">
            <Td className="font-semibold">SPCC Check</Td>
            <Td className="font-mono text-right">{excelCheckCell(snapshot.spccMinRfPassed)}</Td>
            <Td className="font-semibold">CCC Check</Td>
            <Td colSpan={2} className="font-mono text-right">
              {excelCheckCell(snapshot.cccRsdPassed)}
            </Td>
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
            <Td colSpan={2} className="text-neutral-400">—</Td>
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
                Old Cal = selected model ICV calc · LCL/UCL from frozen snapshot criteria
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
