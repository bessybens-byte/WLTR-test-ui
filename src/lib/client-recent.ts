/** Browser-only helpers for ids the API does not list (instruments, runs). */

/** Select option value: user will type a UUID in a text field. */
export const MANUAL_INSTRUMENT_VALUE = "__manual__";

const RECENT_INSTRUMENTS_KEY = "wltr_recent_instruments";
const RUNS_LEGACY_KEY = "wltr_recent_runs";
const RUNS_V2_KEY = "wltr_recent_runs_v2";

export type RecentRunEntry = {
  id: string;
  instrumentId: string;
  runType: number;
};

export function getRecentInstruments(): string[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(RECENT_INSTRUMENTS_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

export function pushRecentInstrument(id: string): void {
  if (typeof sessionStorage === "undefined" || !id) return;
  try {
    const prev = getRecentInstruments();
    const next = [id, ...prev.filter((x) => x !== id)].slice(0, 10);
    sessionStorage.setItem(RECENT_INSTRUMENTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function getRecentRuns(): RecentRunEntry[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(RUNS_V2_KEY);
    if (raw) {
      const v2 = JSON.parse(raw) as unknown;
      if (Array.isArray(v2) && v2.length > 0) {
        return v2
          .filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
          .map((x) => ({
            id: String(x.id ?? ""),
            instrumentId: typeof x.instrumentId === "string" ? x.instrumentId : "",
            runType: typeof x.runType === "number" ? x.runType : 0,
          }))
          .filter((x) => x.id.length > 0);
      }
    }
    const legacy = JSON.parse(sessionStorage.getItem(RUNS_LEGACY_KEY) || "[]") as string[];
    return legacy.map((id) => ({ id, instrumentId: "", runType: 0 }));
  } catch {
    return [];
  }
}

export function pushRecentRun(entry: RecentRunEntry): void {
  if (typeof sessionStorage === "undefined" || !entry.id) return;
  try {
    const prev = getRecentRuns().filter((r) => r.id !== entry.id);
    const next = [entry, ...prev].slice(0, 25);
    sessionStorage.setItem(RUNS_V2_KEY, JSON.stringify(next));
    const legacyIds = [entry.id, ...JSON.parse(sessionStorage.getItem(RUNS_LEGACY_KEY) || "[]") as string[]]
      .filter((x, i, a) => a.indexOf(x) === i)
      .slice(0, 20);
    sessionStorage.setItem(RUNS_LEGACY_KEY, JSON.stringify(legacyIds));
  } catch {
    /* ignore */
  }
}
