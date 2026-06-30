import { cn } from "@/lib/cn";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950",
        className,
      )}
      {...props}
    />
  );
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles =
    variant === "primary"
      ? "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      : variant === "secondary"
        ? "border border-neutral-300 bg-white hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-950 dark:hover:bg-neutral-900"
        : variant === "danger"
          ? "bg-red-600 text-white hover:bg-red-500"
          : "hover:bg-neutral-100 dark:hover:bg-neutral-900";
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50",
        styles,
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-200", className)} {...props} />
  );
}

export function FieldLabel({ text, abbrev }: { text: string; abbrev?: string }) {
  return (
    <>
      {text}
      {abbrev ? (
        <span className="font-normal text-neutral-500 dark:text-neutral-400"> ({abbrev})</span>
      ) : null}
    </>
  );
}

export function FieldHelp({ help, className }: { help: string; className?: string }) {
  return (
    <span className={cn("group relative inline-flex shrink-0", className)}>
      <button
        type="button"
        tabIndex={0}
        aria-label="Field help"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-neutral-300 bg-neutral-50 text-[10px] font-semibold leading-none text-neutral-600 hover:border-neutral-400 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-64 -translate-x-1/2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left text-xs font-normal leading-snug text-neutral-700 shadow-lg group-hover:block group-focus-within:block dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
      >
        {help}
        <span className="absolute left-1/2 top-full -mt-px -translate-x-1/2 border-4 border-transparent border-t-neutral-200 dark:border-t-neutral-700" />
      </span>
    </span>
  );
}

export function LabelWithHelp({
  htmlFor,
  children,
  help,
  className,
}: {
  htmlFor?: string;
  children: ReactNode;
  help: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-1 flex items-start gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
        {children}
      </label>
      <FieldHelp help={help} />
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-neutral-400 focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[120px] w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "ok" | "warn" | "bad" }) {
  const t =
    tone === "ok"
      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
      : tone === "warn"
        ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
        : tone === "bad"
          ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
          : "bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-100";
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", t, className)}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
      <div className="font-medium text-neutral-900 dark:text-neutral-100">{title}</div>
      {hint ? <div className="mt-2">{hint}</div> : null}
    </div>
  );
}
