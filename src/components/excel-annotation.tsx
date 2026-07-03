"use client";

import { cn } from "@/lib/cn";
import {
  EXCEL_MODEL_VARIANTS,
  EXCEL_QUICK_LOOKUP,
  EXCEL_STATUS_LABEL,
  EXCEL_WORKBOOK,
  getExcelField,
  getExcelPage,
  type ExcelFieldAnnotation,
  type ExcelMatchStatus,
} from "@/lib/excel-ui-annotations";
import type { ReactNode } from "react";

const STATUS_TONE: Record<ExcelMatchStatus, string> = {
  same: "border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100",
  renamed: "border-blue-200 bg-blue-50/80 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100",
  split: "border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100",
  partial:
    "border-violet-200 bg-violet-50/80 text-violet-900 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100",
  na: "border-neutral-300 bg-neutral-100/80 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-300",
};

function formatAnnotationLine(ann: ExcelFieldAnnotation): string {
  const parts: string[] = [];
  if (ann.sheet) parts.push(ann.sheet);
  if (ann.location) parts.push(ann.location);
  if (ann.excelLabel) parts.push(`“${ann.excelLabel}”`);
  return parts.join(" · ");
}

function AnnotationBody({ ann, compact }: { ann: ExcelFieldAnnotation; compact?: boolean }) {
  const line = formatAnnotationLine(ann);
  const status = ann.status ?? (ann.note && !line ? "na" : "same");

  return (
    <span className={cn("block leading-snug", compact ? "text-[9px]" : "text-[10px]")}>
      {status !== "same" || !line ? (
        <span
          className={cn(
            "mr-1 inline rounded px-1 py-px font-semibold uppercase tracking-wide",
            compact ? "text-[8px]" : "text-[9px]",
            STATUS_TONE[status],
          )}
        >
          {EXCEL_STATUS_LABEL[status]}
        </span>
      ) : null}
      {line ? (
        <span className="font-mono text-violet-800 dark:text-violet-200">{line}</span>
      ) : null}
      {ann.note ? (
        <span className={cn("text-neutral-600 dark:text-neutral-400", line ? " mt-0.5 block" : "")}>
          {ann.note}
        </span>
      ) : null}
    </span>
  );
}

/** Inline hint below a form field — pass fieldKey or raw annotation. */
export function ExcelAnnotation({
  fieldKey,
  annotation,
  className,
  compact,
}: {
  fieldKey?: string;
  annotation?: ExcelFieldAnnotation;
  className?: string;
  compact?: boolean;
}) {
  const ann = annotation ?? (fieldKey ? getExcelField(fieldKey) : undefined);
  if (!ann) return null;

  return (
    <div
      className={cn(
        "mt-1 rounded border border-violet-200/60 bg-violet-50/40 px-2 py-1 dark:border-violet-900/50 dark:bg-violet-950/20",
        className,
      )}
      title={`Excel workbook: ${EXCEL_WORKBOOK}`}
    >
      <span className={cn("font-semibold text-violet-700 dark:text-violet-300", compact ? "text-[9px]" : "text-[10px]")}>
        Excel↔UI
      </span>{" "}
      <AnnotationBody ann={ann} compact={compact} />
    </div>
  );
}

/** Table header with Excel cross-reference sub-line. */
export function ExcelTh({
  fieldKey,
  children,
  className,
  compact = true,
}: {
  fieldKey: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const ann = getExcelField(fieldKey);

  return (
    <th className={cn("align-top", className)}>
      <div className="font-medium">{children}</div>
      {ann ? (
        <div className="mt-0.5 max-w-[11rem] font-normal">
          <AnnotationBody ann={ann} compact={compact} />
        </div>
      ) : null}
    </th>
  );
}

/** Page-level guide banner for developers / testers. */
export function ExcelPageGuide({ pageKey, className }: { pageKey: string; className?: string }) {
  const guide = getExcelPage(pageKey);
  if (!guide) return null;

  return (
    <div
      className={cn(
        "mb-4 rounded-lg border border-violet-300 bg-violet-50 px-4 py-3 text-sm dark:border-violet-800 dark:bg-violet-950/30",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-200">
            Excel mapping — {guide.title}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-violet-950 dark:text-violet-100">{guide.description}</p>
          {guide.lookupHint ? (
            <p className="mt-1 text-[11px] text-violet-800/90 dark:text-violet-200/90">
              <span className="font-medium">Where to look:</span> {guide.lookupHint}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-right text-[10px] text-violet-700 dark:text-violet-300">
          <div className="font-medium">Workbook</div>
          <div className="max-w-[14rem] font-mono leading-tight">{EXCEL_WORKBOOK}</div>
          <div className="mt-1 font-medium">Sheets</div>
          <div>{guide.sheets.join(" · ")}</div>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-violet-700 dark:text-violet-400">
        Violet “Excel↔UI” hints on fields and columns map to{" "}
        <code className="rounded bg-violet-100 px-1 dark:bg-violet-900">docs/EXCEL_UI_FIELD_MAP.md</code>.
      </p>
    </div>
  );
}

/** Section heading with Excel sheet reference. */
export function ExcelSectionHint({
  sheet,
  location,
  note,
  className,
}: {
  sheet: string;
  location?: string;
  note?: string;
  className?: string;
}) {
  return (
    <p className={cn("text-[10px] text-violet-700 dark:text-violet-300", className)}>
      <span className="font-semibold">Excel:</span>{" "}
      <span className="font-mono">
        {sheet}
        {location ? ` · ${location}` : ""}
      </span>
      {note ? <span className="text-neutral-600 dark:text-neutral-400"> — {note}</span> : null}
    </p>
  );
}

/** Nine DVD model variants — UI label ↔ Excel row block. */
export function ExcelModelVariantTable({ className }: { className?: string }) {
  return (
    <details className={cn("rounded-lg border border-violet-200/80 bg-violet-50/30 dark:border-violet-900 dark:bg-violet-950/20", className)}>
      <summary className="cursor-pointer px-3 py-2 text-[11px] font-medium text-violet-900 dark:text-violet-100">
        DVD rows 246–263 — nine model variants (UI ↔ Excel labels)
      </summary>
      <div className="overflow-x-auto border-t border-violet-200/80 px-2 pb-2 dark:border-violet-900">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="text-left text-violet-800 dark:text-violet-200">
              <th className="py-1 pr-2 font-medium">UI (type / weighting)</th>
              <th className="py-1 pr-2 font-medium">DVD rows</th>
              <th className="py-1 pr-2 font-medium">Excel label</th>
            </tr>
          </thead>
          <tbody>
            {EXCEL_MODEL_VARIANTS.map((row) => (
              <tr key={row.uiLabel} className="border-t border-violet-100 dark:border-violet-900/60">
                <td className="py-1 pr-2">{row.uiLabel}</td>
                <td className="py-1 pr-2 font-mono">{row.dvdRows}</td>
                <td className="py-1 pr-2">{row.excelLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[9px] text-violet-700 dark:text-violet-400">
          Row numbers refer to one analyte block on DVD (~240–270 in preload); pattern repeats per compound.
        </p>
      </div>
    </details>
  );
}

/** Persistent dev banner in app shell. */
export function ExcelDevBanner() {
  return (
    <div className="mb-4 rounded-lg border border-dashed border-violet-400/70 bg-violet-50/50 px-3 py-2 text-[11px] text-violet-900 dark:border-violet-700 dark:bg-violet-950/20 dark:text-violet-100">
      <div>
        <span className="font-semibold">Dev UI — Excel cross-reference mode.</span> Violet hints map fields to{" "}
        <span className="font-mono">{EXCEL_WORKBOOK}</span>. Full map:{" "}
        <code className="rounded bg-violet-100 px-1 dark:bg-violet-900">docs/EXCEL_UI_FIELD_MAP.md</code>.
      </div>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {EXCEL_QUICK_LOOKUP.map((item) => (
          <li key={item.uiHint} className="text-[10px]">
            <span className="font-medium">{item.uiHint}</span>
            <span className="text-violet-700 dark:text-violet-300"> → </span>
            <span className="font-mono">{item.excelWhere}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
