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
    void plotly().then(async (Plotly) => {
      if (!alive) return;
      await Plotly.react(el, payload.data, payload.layout, {
        ...(typeof payload.config === "object" && payload.config !== null ? payload.config : {}),
        responsive: true,
      });
    });

    return () => {
      alive = false;
      void plotly().then((Plotly) => {
        Plotly.purge(el);
      });
    };
  }, [payload]);

  useEffect(() => {
    if (!payload) return;
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      void plotly().then((Plotly) => {
        Plotly.Plots.resize(el);
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
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
