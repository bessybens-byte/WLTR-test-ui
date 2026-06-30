"use client";

import { COMPOUND_CATEGORY_LABEL } from "@/lib/types/wltr";
import { fmtNum } from "@/components/report-format-utils";

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
            <th className="py-2 pr-2">Compound</th>
            <th className="py-2 pr-2">Category</th>
            <th className="py-2 pr-2">Analyte</th>
            <th className="py-2 pr-2">Response</th>
            <th className="py-2 pr-2">RT</th>
            <th className="py-2 pr-2">Quant ion</th>
            <th className="py-2 pr-2">Manual</th>
            <th className="py-2 pr-2">Calc conc</th>
            <th className="py-2 pr-2">True conc</th>
            <th className="py-2 pr-2">IS resp</th>
            <th className="py-2 pr-2">Ratio</th>
            <th className="py-2 pr-2">Conc ratio</th>
            <th className="py-2 pr-2">Conc ratio²</th>
            <th className="py-2 pr-2">RF</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const mid = String(r.id ?? r.rawCompoundName ?? Math.random());
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
