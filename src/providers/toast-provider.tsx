"use client";

import { cn } from "@/lib/cn";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type ToastTone = "info" | "success" | "warn" | "error";

type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
};

type ToastInput = {
  tone?: ToastTone;
  title: string;
  description?: string;
  /** Milliseconds before auto-dismiss. Defaults to 4500; set 0 to persist. */
  duration?: number;
};

type ToastApi = {
  toast: (input: ToastInput) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warn: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const TONE_STYLES: Record<ToastTone, string> = {
  info: "border-blue-200 bg-white dark:border-blue-900 dark:bg-neutral-950",
  success: "border-emerald-200 bg-white dark:border-emerald-900 dark:bg-neutral-950",
  warn: "border-amber-200 bg-white dark:border-amber-900 dark:bg-neutral-950",
  error: "border-red-200 bg-white dark:border-red-900 dark:bg-neutral-950",
};

const TONE_DOT: Record<ToastTone, string> = {
  info: "bg-blue-500",
  success: "bg-emerald-500",
  warn: "bg-amber-500",
  error: "bg-red-500",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  const idRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ tone = "info", title, description, duration = 4500 }: ToastInput) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, tone, title, description }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      success: (title, description) => toast({ tone: "success", title, description }),
      error: (title, description) => toast({ tone: "error", title, description, duration: 7000 }),
      info: (title, description) => toast({ tone: "info", title, description }),
      warn: (title, description) => toast({ tone: "warn", title, description }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted
        ? createPortal(
            <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
              {toasts.map((t) => (
                <div
                  key={t.id}
                  role="status"
                  className={cn(
                    "pointer-events-auto flex items-start gap-3 rounded-xl border p-3 shadow-lg",
                    TONE_STYLES[t.tone],
                  )}
                >
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TONE_DOT[t.tone])} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{t.title}</div>
                    {t.description ? (
                      <div className="mt-0.5 break-words text-xs text-neutral-600 dark:text-neutral-400">
                        {t.description}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-label="Dismiss"
                    onClick={() => dismiss(t.id)}
                    className="shrink-0 rounded-md px-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
