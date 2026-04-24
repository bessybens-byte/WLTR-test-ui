export function isDirectApi(): boolean {
  return process.env.NEXT_PUBLIC_WLTR_DIRECT_API === "true";
}

/** Browser/client: base for API calls (BFF proxy or direct). */
export function getClientApiBase(): string {
  if (typeof window === "undefined") return "/api/wltr";
  if (isDirectApi()) {
    return (process.env.NEXT_PUBLIC_WLTR_API_BASE_URL || "http://localhost:5000/api").replace(
      /\/$/,
      "",
    );
  }
  return "/api/wltr";
}

export function buildApiUrl(path: string, searchParams?: Record<string, string | number | undefined | null>): string {
  const base = getClientApiBase().replace(/\/$/, "");
  const p = `${base}/${path.replace(/^\//, "")}`;
  const sp = new URLSearchParams();
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v === undefined || v === null || v === "") continue;
      sp.set(k, String(v));
    }
  }
  const q = sp.toString();
  return q ? `${p}?${q}` : p;
}
