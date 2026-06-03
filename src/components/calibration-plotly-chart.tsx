"use client";

import { useEffect, useMemo, useRef } from "react";

type PlotlyStatic = Readonly<{
  react: (el: HTMLElement, data: unknown[], layout?: unknown, config?: unknown) => Promise<void>;
  purge: (el: HTMLElement) => void;
  Plots: { resize: (el: HTMLElement) => void };
}>;

async function plotly(): Promise<PlotlyStatic> {
  const mod = await import("plotly.js-dist-min");
  const P = mod as { default?: PlotlyStatic } & PlotlyStatic;
  const inst = P.default ?? P;
  return inst as PlotlyStatic;
}

function isPlotDisplayed(el: HTMLElement): boolean {
  if (!el.classList.contains("js-plotly-plot")) return false;
  const { width, height } = el.getBoundingClientRect();
  return width > 0 && height > 0;
}

/** Renders Plotly **`data` / `layout` / `config`** from the calibration chart API (`perm.view`). */
export function CalibrationPlotlyChart({
  chartJson,
  className,
}: Readonly<{
  chartJson: Record<string, unknown> | null | undefined;
  className?: string;
}>) {
  const ref = useRef<HTMLDivElement>(null);

  const payload = useMemo(() => {
    if (!chartJson || typeof chartJson !== "object") return null;
    const data = chartJson.data ?? chartJson.Data;
    const layout = chartJson.layout ?? chartJson.Layout ?? {};
    const config = chartJson.config ?? chartJson.Config ?? {};
    if (!Array.isArray(data) || data.length === 0) return null;
    return {
      data,
      layout: typeof layout === "object" && layout !== null ? layout : {},
      config: typeof config === "object" && config !== null ? config : {},
    };
  }, [chartJson]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !payload) return;

    let alive = true;
    let ro: ResizeObserver | null = null;

    void plotly().then(async (Plotly) => {
      if (!alive) return;
      await Plotly.react(el, payload.data, payload.layout, {
        ...(typeof payload.config === "object" && payload.config !== null ? payload.config : {}),
        responsive: true,
      });
      if (!alive) return;

      ro = new ResizeObserver(() => {
        if (!isPlotDisplayed(el)) return;
        try {
          Plotly.Plots.resize(el);
        } catch {
          // Plotly throws if the div is not yet a displayed plot (e.g. hidden tab).
        }
      });
      ro.observe(el);
    });

    return () => {
      alive = false;
      ro?.disconnect();
      void plotly().then((Plotly) => {
        if (el.classList.contains("js-plotly-plot")) Plotly.purge(el);
      });
    };
  }, [payload]);

  if (!payload) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50/60 text-xs text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/40">
        No chart data in response.
      </div>
    );
  }

  return <div ref={ref} className={className ?? "h-[min(52vh,460px)] w-full min-h-[280px]"} />;
}
