"use client";

import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export type TabItem = {
  id: string;
  label: string;
  /** Optional small count/status badge shown next to the label. */
  badge?: ReactNode;
  /** Optional dot color to signal state (e.g. done/blocked). */
  disabled?: boolean;
};

/** Horizontal, scrollable tab bar. Controlled via `active`/`onChange`. */
export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: readonly TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-neutral-200 dark:border-neutral-800", className)}>
      <div
        className="flex gap-1 overflow-x-auto"
        role="tablist"
        aria-label="Sections"
      >
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={t.disabled}
              onClick={() => onChange(t.id)}
              className={cn(
                "-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition",
                isActive
                  ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
                  : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-800 dark:hover:border-neutral-700 dark:hover:text-neutral-200",
                t.disabled ? "cursor-not-allowed opacity-40 hover:border-transparent" : "",
              )}
            >
              {t.label}
              {t.badge != null ? (
                <Badge tone="neutral" className="px-1.5 py-0 text-[10px]">
                  {t.badge}
                </Badge>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type StepState = "done" | "current" | "todo" | "blocked";

export type StepItem = {
  id: string;
  label: string;
  state: StepState;
};

const STEP_DOT: Record<StepState, string> = {
  done: "bg-emerald-500 text-white",
  current: "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900",
  todo: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  blocked: "bg-amber-500 text-white",
};

/** Compact horizontal progress stepper. Clicking a step jumps to it. */
export function Stepper({
  steps,
  onSelect,
  className,
}: {
  steps: readonly StepItem[];
  onSelect?: (id: string) => void;
  className?: string;
}) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-x-2 gap-y-3", className)}>
      {steps.map((s, i) => (
        <li key={s.id} className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSelect ? () => onSelect(s.id) : undefined}
            className={cn(
              "flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-medium transition",
              onSelect ? "hover:bg-neutral-100 dark:hover:bg-neutral-900" : "",
              s.state === "current" ? "ring-1 ring-neutral-300 dark:ring-neutral-700" : "",
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold",
                STEP_DOT[s.state],
              )}
            >
              {s.state === "done" ? "✓" : i + 1}
            </span>
            <span
              className={cn(
                s.state === "todo" ? "text-neutral-500 dark:text-neutral-400" : "text-neutral-900 dark:text-neutral-100",
              )}
            >
              {s.label}
            </span>
          </button>
          {i < steps.length - 1 ? (
            <span className="hidden h-px w-6 bg-neutral-300 dark:bg-neutral-700 sm:block" aria-hidden />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
