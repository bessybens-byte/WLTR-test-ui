"use client";

import { COMPOUND_CATEGORY_LABEL } from "@/lib/types/wltr";
import { fmtNum } from "@/components/report-format-utils";
import { ExcelTh } from "@/components/excel-annotation";

function categoryLabel(v: unknown): string {
  return typeof v === "number" ? (COMPOUND_CATEGORY_LABEL[v] ?? String(v)) : "—";
}

export function RunMeasurementsTable({ rows }: { readonly rows: Record<string, unknown>[] }) {
  if (rows.length === 0) {
    return <div className="text-sm text-neutral-500">No measurements.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
            <ExcelTh fieldKey="measurement.rawCompoundName" className="py-2 pr-2">
              Compound
            </ExcelTh>
            <ExcelTh fieldKey="measurement.compoundCategory" className="py-2 pr-2">
              Category
            </ExcelTh>
            <ExcelTh fieldKey="measurement.canonicalAnalyteName" className="py-2 pr-2">
              Analyte
            </ExcelTh>
            <ExcelTh fieldKey="measurement.response" className="py-2 pr-2">
              Response
            </ExcelTh>
            <ExcelTh fieldKey="measurement.retentionTime" className="py-2 pr-2">
              RT
            </ExcelTh>
            <ExcelTh fieldKey="measurement.quantIon" className="py-2 pr-2">
              Quant ion
            </ExcelTh>
            <ExcelTh fieldKey="measurement.isManualIntegration" className="py-2 pr-2">
              Manual
            </ExcelTh>
            <ExcelTh fieldKey="measurement.calculatedConcentration" className="py-2 pr-2">
              Calc conc
            </ExcelTh>
            <ExcelTh fieldKey="measurement.trueConcentration" className="py-2 pr-2">
              True conc
            </ExcelTh>
            <ExcelTh fieldKey="measurement.internalStandardResponse" className="py-2 pr-2">
              IS resp
            </ExcelTh>
            <ExcelTh fieldKey="measurement.responseRatio" className="py-2 pr-2">
              Ratio
            </ExcelTh>
            <ExcelTh fieldKey="measurement.concentrationRatio" className="py-2 pr-2">
              Conc ratio
            </ExcelTh>
            <ExcelTh fieldKey="measurement.concentrationRatioSquared" className="py-2 pr-2">
              Conc ratio²
            </ExcelTh>
            <ExcelTh fieldKey="measurement.responseFactor" className="py-2 pr-2">
              RF
            </ExcelTh>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => {
            const mid = String(r.id ?? r.rawCompoundName ?? `row-${idx}`);
            return (
              <tr key={mid} className="border-b border-neutral-100 dark:border-neutral-900">
                <td className="py-2 pr-2">{String(r.rawCompoundName ?? "")}</td>
                <td className="py-2 pr-2">{categoryLabel(r.compoundCategory)}</td>
                <td className="py-2 pr-2">
                  {r.isResolved ? String(r.canonicalAnalyteName ?? r.analyteId ?? "—") : "—"}
                </td>
                <td className="py-2 pr-2 font-mono">{fmtNum(r.response)}</td>
                <td className="py-2 pr-2 font-mono">{fmtNum(r.retentionTime, 3)}</td>
                <td className="py-2 pr-2 font-mono">{fmtNum(r.quantIon, 2)}</td>
                <td className="py-2 pr-2">{r.isManualIntegration ? "Yes" : "No"}</td>
                <td className="py-2 pr-2 font-mono">{fmtNum(r.calculatedConcentration)}</td>
                <td className="py-2 pr-2 font-mono">{fmtNum(r.trueConcentration)}</td>
                <td className="py-2 pr-2 font-mono">{fmtNum(r.internalStandardResponse)}</td>
                <td className="py-2 pr-2 font-mono">{fmtNum(r.responseRatio)}</td>
                <td className="py-2 pr-2 font-mono">{fmtNum(r.concentrationRatio)}</td>
                <td className="py-2 pr-2 font-mono">{fmtNum(r.concentrationRatioSquared)}</td>
                <td className="py-2 pr-2 font-mono">{fmtNum(r.responseFactor)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
