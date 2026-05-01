import { buildApiUrl, isDirectApi } from "@/lib/api/config";
import { ApiError, parseErrorResponse } from "@/lib/api/errors";
import { getAccessToken, setAccessToken } from "@/lib/auth/access-token";

export type ApiFetchInit = RequestInit & {
  searchParams?: Record<string, string | number | undefined | null>;
  /** Skip attaching Bearer from memory (e.g. login). */
  skipAuth?: boolean;
  /** Skip refresh retry on 401. */
  skipRefresh?: boolean;
};

let refreshInFlight: Promise<boolean> | null = null;

/** Exchange refresh (cookie BFF, or sessionStorage in direct mode) for a new access token. */
export async function refreshAccessToken(): Promise<boolean> {
  return tryRefresh();
}

async function tryRefresh(): Promise<boolean> {
  if (isDirectApi()) {
    const rt = typeof window !== "undefined" ? sessionStorage.getItem("wltr_refresh") : null;
    if (!rt) return false;
    const url = buildApiUrl("Auth/refresh");
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
    if (data.accessToken) setAccessToken(data.accessToken);
    if (data.refreshToken && typeof window !== "undefined") {
      sessionStorage.setItem("wltr_refresh", data.refreshToken);
    }
    return true;
  }

  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const url = buildApiUrl("Auth/refresh");
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken?: string };
    if (data.accessToken) setAccessToken(data.accessToken);
    return true;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function apiFetch(path: string, init?: ApiFetchInit): Promise<Response> {
  const { searchParams, skipAuth, skipRefresh, ...rest } = init || {};
  const url = buildApiUrl(path.replace(/^\//, ""), searchParams);
  const headers = new Headers(rest.headers);
  /** Invalid/expired Bearer causes JwtBearer middleware to return 401 before anonymous actions run — drop it explicitly. */
  if (skipAuth) headers.delete("Authorization");
  const token = getAccessToken();
  if (token && !skipAuth && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (
    rest.body &&
    typeof rest.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const doFetch = () =>
    fetch(url, {
      ...rest,
      headers,
      credentials: "include",
    });

  let res = await doFetch();
  const isAuthPath =
    path.startsWith("Auth/login") ||
    path.startsWith("Auth/refresh") ||
    path.startsWith("Auth/forgot-password") ||
    path.startsWith("Auth/reset-password") ||
    path.startsWith("Auth/accept-invite");

  if (res.status === 401 && !skipRefresh && !skipAuth && !isAuthPath) {
    const ok = await tryRefresh();
    if (ok) {
      const h2 = new Headers(rest.headers);
      const t2 = getAccessToken();
      if (t2) h2.set("Authorization", `Bearer ${t2}`);
      res = await fetch(url, { ...rest, headers: h2, credentials: "include" });
    }
  }
  return res;
}

export async function apiJson<T>(path: string, init?: ApiFetchInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (res.status === 204) return undefined as T;
  if (!res.ok) throw await parseErrorResponse(res);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("json")) {
    const t = await res.text();
    return t as unknown as T;
  }
  return (await res.json()) as T;
}

export async function apiJsonOrThrow<T>(path: string, init?: ApiFetchInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) throw await parseErrorResponse(res);
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("json")) {
    const t = await res.text();
    return t as unknown as T;
  }
  return (await res.json()) as T;
}

export { ApiError };
