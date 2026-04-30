"use client";

import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { JSX, ReactNode } from "react";
import { useCallback, useId, useState } from "react";

export type JsonPrettyViewProps = {
  readonly value: unknown;
  /** Enables QA-style card chrome with header stripe and title row. */
  readonly title?: string;
  readonly subtitle?: ReactNode;
  readonly className?: string;
};

function Primitive({ value }: { readonly value: unknown }): JSX.Element {
  if (value === undefined) return <span className="italic text-neutral-400">undefined</span>;
  if (value === null) return <span className="text-violet-600 dark:text-violet-400">null</span>;
  if (typeof value === "boolean")
    return <span className="text-sky-600 dark:text-sky-400">{String(value)}</span>;
  if (typeof value === "number") {
    const s = Number.isFinite(value) ? String(value) : JSON.stringify(value);
    return <span className="text-teal-600 dark:text-teal-400 tabular-nums">{s}</span>;
  }
  if (typeof value === "string") {
    return (
      <span className="break-all text-emerald-800 dark:text-emerald-300">{JSON.stringify(value)}</span>
    );
  }
  return <span className="text-neutral-700 dark:text-neutral-300">{String(value)}</span>;
}

type BlockProps = {
  readonly value: unknown;
  readonly depth: number;
  readonly propertyKey?: string;
};

const DETAILS_CLASSES =
  "[&_summary::-webkit-details-marker]:hidden [&>summary]:list-none [&>summary]:cursor-pointer [&>summary]:select-none [&>summary]:rounded [&>summary]:px-0.5 [&>summary]:py-0.5 [&>summary]:hover:bg-neutral-200/80 dark:[&>summary]:hover:bg-neutral-800/90";

/** Collapsible syntax-styled JSON tree with relaxed monospace for scanning large payloads. */
function JsonBlock({ value, depth, propertyKey }: BlockProps): JSX.Element {
  const rowId = useId();
  const pad = depth * 16;

  const keySlot =
    propertyKey !== undefined ? (
      <>
        <span className="text-amber-900 dark:text-amber-200">{JSON.stringify(propertyKey)}</span>
        <span className="text-neutral-400">: </span>
      </>
    ) : null;

  if (value === undefined || value === null || typeof value !== "object") {
    return (
      <div className="py-1 font-mono text-[13px] leading-relaxed tracking-tight">
        <span style={{ paddingLeft: pad }} className="inline-block">
          {keySlot}
          <Primitive value={value} />
        </span>
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <div className="py-1 font-mono text-[13px] leading-relaxed tracking-tight">
          <span style={{ paddingLeft: pad }} className="inline-block">
            {keySlot}
            <span className="text-neutral-500">[]</span>
          </span>
        </div>
      );
    }
    const openDefault = depth < 2;
    return (
      <div className="font-mono text-[13px] leading-relaxed tracking-tight">
        <div style={{ paddingLeft: pad }} className="py-1">
          {keySlot}
          <details open={openDefault} className={`group ${DETAILS_CLASSES}`}>
            <summary>
              <span className="text-neutral-700 dark:text-neutral-300">
                <span className="text-orange-900/70 dark:text-orange-200/70">{"["}</span>
                <span className="mx-1 text-neutral-400">{value.length}</span>
                <span className="text-neutral-600 dark:text-neutral-400">{value.length === 1 ? " item" : " items"}</span>
                <span className="text-orange-900/70 dark:text-orange-200/70">{"]"}</span>
              </span>
            </summary>
            <div className="border-l border-neutral-200 py-2 pl-4 ml-3 dark:border-neutral-700 space-y-0.5 mt-2">
              {value.map((item, index) => (
                <div key={`${rowId}:${index}`} className="flex flex-wrap gap-x-1 gap-y-0.5 items-baseline">
                  <span className="shrink-0 select-none text-neutral-400">[{index}]</span>
                  <span className="text-neutral-400">:</span>
                  <span className="min-w-0 flex-1">
                    <JsonBlock value={item} depth={depth + 1} />
                  </span>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    );
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    return (
      <div className="py-1 font-mono text-[13px] leading-relaxed tracking-tight">
        <span style={{ paddingLeft: pad }} className="inline-block">
          {keySlot}
          <span className="text-neutral-500">{"{}"}</span>
        </span>
      </div>
    );
  }

  const openDefault = depth < 2;
  return (
    <div className="font-mono text-[13px] leading-relaxed tracking-tight">
      <div style={{ paddingLeft: pad }} className="py-1">
        {keySlot}
        <details open={openDefault} className={`group ${DETAILS_CLASSES}`}>
          <summary>
            <span className="text-neutral-700 dark:text-neutral-300">
              <span className="text-sky-900/80 dark:text-sky-200/80">{"{"}</span>
              <span className="mx-1 text-neutral-400">{keys.length}</span>
              <span className="text-neutral-600 dark:text-neutral-400">{keys.length === 1 ? " key" : " keys"}</span>
              <span className="text-sky-900/80 dark:text-sky-200/80">{"}"}</span>
            </span>
          </summary>
          <div className="border-l border-neutral-200 py-2 pl-4 ml-3 mt-2 space-y-0.5 dark:border-neutral-700">
            {keys.map((k) => (
              <JsonBlock key={k} value={obj[k]} depth={depth + 1} propertyKey={k} />
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}

export function JsonPrettyView({ value, title, subtitle, className }: JsonPrettyViewProps) {
  const [copied, setCopied] = useState(false);
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [text]);

  const copyBtn = (
    <Button type="button" variant="secondary" className="!shrink-0 !text-xs" onClick={() => void onCopy()}>
      {copied ? "Copied" : "Copy JSON"}
    </Button>
  );

  const treeViewport = (
    <div className="max-h-[32rem] overflow-auto bg-neutral-50 px-5 py-4 dark:bg-[#0c0c0e]">
      <JsonBlock value={value} depth={0} />
    </div>
  );

  const useInspectCard = Boolean(title ?? subtitle);

  if (!useInspectCard) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex flex-wrap justify-end gap-2">{copyBtn}</div>
        <div className="max-h-[32rem] overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-4 shadow-inner ring-1 ring-black/[0.04] dark:border-neutral-800 dark:bg-[#0c0c0e] dark:ring-white/[0.06]">
          <JsonBlock value={value} depth={0} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-md ring-1 ring-black/[0.02] dark:border-neutral-700 dark:bg-neutral-950 dark:shadow-xl dark:shadow-black/40 dark:ring-white/[0.05]",
        className,
      )}
    >
      <div className="flex border-b border-neutral-200/90 dark:border-neutral-700">
        <div
          aria-hidden
          className="w-[3px] shrink-0 bg-gradient-to-b from-amber-400 via-orange-500 to-amber-600 dark:from-amber-500 dark:to-orange-800"
        />
        <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3 bg-gradient-to-r from-amber-50 via-white to-neutral-50 px-4 py-3 dark:from-amber-950/35 dark:via-neutral-950 dark:to-neutral-950">
          <div className="min-w-0">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-900/90 dark:text-amber-200/95">
              {title ?? "Debug payload"}
            </div>
            {subtitle ? <div className="mt-1.5 space-y-0.5 text-xs text-neutral-600 dark:text-neutral-400">{subtitle}</div> : null}
          </div>
          {copyBtn}
        </div>
      </div>
      {treeViewport}
    </div>
  );
}

