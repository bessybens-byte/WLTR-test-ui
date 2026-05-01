import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const REFRESH_COOKIE = "wltr_refresh";

function apiOrigin(): string {
  return process.env.WLTR_API_ORIGIN || "http://localhost:5000";
}

function joinPath(segments: string[] | undefined): string {
  if (!segments?.length) return "";
  return segments.map((s) => encodeURIComponent(s)).join("/");
}

/** JwtBearer rejects bad/expired Bearer with 401 before AllowAnonymous endpoints run — do not forward. */
function shouldStripForwardedAuth(joined: string): boolean {
  return (
    joined === "Auth/login" ||
    joined === "Auth/refresh" ||
    joined === "Auth/forgot-password" ||
    joined === "Auth/reset-password" ||
    joined === "Auth/accept-invite"
  );
}

async function readRefreshFromCookie(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(REFRESH_COOKIE)?.value;
}

function stripRefreshFromJson(text: string): { parsed: unknown; refreshToken?: string } {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const refreshToken =
      typeof parsed.refreshToken === "string" ? parsed.refreshToken : undefined;
    if (refreshToken) delete parsed.refreshToken;
    return { parsed, refreshToken };
  } catch {
    return { parsed: text };
  }
}

async function proxy(
  request: NextRequest,
  segments: string[] | undefined,
  method: string,
): Promise<NextResponse> {
  const origin = apiOrigin();
  const joined = joinPath(segments);

  let target: string;
  if (!joined) {
    if (method !== "GET") {
      return NextResponse.json({ title: "Not Found", status: 404, detail: "Empty proxy path" }, { status: 404 });
    }
    target = `${origin}/`;
  } else {
    target = `${origin}/api/${joined}`;
  }

  const url = new URL(target);
  url.search = request.nextUrl.search;

  const headers = new Headers();
  const stripAuth = shouldStripForwardedAuth(joined);
  const pass = ["content-type", "accept", "authorization", "user-agent"];
  for (const h of pass) {
    if (stripAuth && h === "authorization") continue;
    const v = request.headers.get(h);
    if (v) headers.set(h, v);
  }

  const authPath = joined.startsWith("Auth/");
  const refreshLogout = authPath && (joined === "Auth/refresh" || joined === "Auth/logout");

  let body: BodyInit | undefined;
  if (method !== "GET" && method !== "HEAD") {
    if (refreshLogout) {
      let bodyText = await request.text();
      if (bodyText) {
        try {
          const j = JSON.parse(bodyText) as Record<string, unknown>;
          if (!j.refreshToken) {
            const rt = await readRefreshFromCookie();
            if (rt) j.refreshToken = rt;
            bodyText = JSON.stringify(j);
          }
        } catch {
          /* ignore */
        }
      } else {
        const rt = await readRefreshFromCookie();
        if (rt) bodyText = JSON.stringify({ refreshToken: rt });
      }
      body = bodyText;
    } else {
      const inboundCt = request.headers.get("content-type") || "";
      if (inboundCt.includes("multipart/form-data")) {
        body = await request.arrayBuffer();
      } else {
        body = await request.text();
      }
    }
  }

  const upstream = await fetch(url.toString(), {
    method,
    headers,
    body,
    redirect: "manual",
  });

  const ct = upstream.headers.get("content-type") || "";

  if (method === "POST" && joined === "Auth/login" && upstream.ok && ct.includes("json")) {
    const raw = await upstream.text();
    const { parsed, refreshToken } = stripRefreshFromJson(raw);
    const res = NextResponse.json(parsed, { status: upstream.status });
    if (refreshToken) {
      res.cookies.set(REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return res;
  }

  if (method === "POST" && joined === "Auth/refresh" && upstream.ok && ct.includes("json")) {
    const raw = await upstream.text();
    const { parsed, refreshToken } = stripRefreshFromJson(raw);
    const res = NextResponse.json(parsed, { status: upstream.status });
    if (refreshToken) {
      res.cookies.set(REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return res;
  }

  if (method === "POST" && joined === "Auth/logout" && upstream.status === 204) {
    const res = new NextResponse(null, { status: 204 });
    res.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  }

  const status = upstream.status;
  const buf = await upstream.arrayBuffer();

  // 204/205/304 must not include a message body; Response rejects non-null bodies with 204.
  if (status === 204 || status === 205 || status === 304) {
    const res = new NextResponse(null, { status });
    const loc = upstream.headers.get("location");
    if (loc) res.headers.set("location", loc);
    return res;
  }

  const res = new NextResponse(buf, { status });
  if (ct) res.headers.set("content-type", ct);
  return res;
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await ctx.params;
  return proxy(request, path, "GET");
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await ctx.params;
  return proxy(request, path, "POST");
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await ctx.params;
  return proxy(request, path, "PUT");
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await ctx.params;
  return proxy(request, path, "PATCH");
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await ctx.params;
  return proxy(request, path, "DELETE");
}
