"use client";

import { apiFetch, apiJson, refreshAccessToken } from "@/lib/api/client";
import { parseErrorResponse } from "@/lib/api/errors";
import { isDirectApi } from "@/lib/api/config";
import { getAccessToken, setAccessToken } from "@/lib/auth/access-token";
import type { LoginResponse, MeResponse } from "@/lib/types/wltr";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type AuthCtx = {
  me: MeResponse | null;
  loading: boolean;
  refreshMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

async function loginDirect(email: string, password: string) {
  const base = (process.env.NEXT_PUBLIC_WLTR_API_BASE_URL || "http://localhost:5000/api").replace(
    /\/$/,
    "",
  );
  const res = await fetch(`${base}/Auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw await parseErrorResponse(res);
  const data = (await res.json()) as LoginResponse;
  if (data.accessToken) setAccessToken(data.accessToken);
  if (data.refreshToken && typeof window !== "undefined") {
    sessionStorage.setItem("wltr_refresh", data.refreshToken);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const t = getAccessToken();
    if (!t) {
      setMe(null);
      return;
    }
    try {
      const data = await apiJson<MeResponse>("Auth/me");
      setMe(data);
    } catch {
      setMe(null);
      setAccessToken(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (!getAccessToken()) {
        await refreshAccessToken();
      }
      if (getAccessToken()) {
        await refreshMe();
      }
      setLoading(false);
    })();
  }, [refreshMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (isDirectApi()) {
        await loginDirect(email, password);
      } else {
        const res = await apiFetch("Auth/login", {
          method: "POST",
          skipAuth: true,
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) throw await parseErrorResponse(res);
        const data = (await res.json()) as LoginResponse;
        if (data.accessToken) setAccessToken(data.accessToken);
      }
      await refreshMe();
    },
    [refreshMe],
  );

  const logout = useCallback(async () => {
    try {
      const body = (() => {
        if (typeof window === "undefined") return "{}";
        if (isDirectApi()) {
          const rt = sessionStorage.getItem("wltr_refresh");
          return JSON.stringify({ refreshToken: rt ?? "" });
        }
        return JSON.stringify({});
      })();
      await apiFetch("Auth/logout", { method: "POST", body });
    } finally {
      setAccessToken(null);
      if (typeof window !== "undefined") sessionStorage.removeItem("wltr_refresh");
      setMe(null);
    }
  }, []);

  const value = useMemo(
    () => ({ me, loading, refreshMe, login, logout }),
    [me, loading, refreshMe, login, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
