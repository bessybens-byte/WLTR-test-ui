# WLTR Docs (web UI)

Next.js (App Router) client for the **WLTR** REST API: laboratories, runs, calibration groups, method configs, and related admin flows. The UI talks to the backend either through a **same-origin BFF proxy** (default in dev) or **directly** to a public API URL (optional).

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 10+ (or compatible package manager)
- A running **WLTR API** (default expectations below assume it on port **5000**)

## Install

```bash
npm install
```

## Configuration

| Variable | Where | Purpose |
|----------|--------|---------|
| `WLTR_API_ORIGIN` | Server only | Base URL of the backend **without** `/api` (no trailing slash). Used by `src/app/api/wltr/[[...path]]/route.ts` to proxy browser calls. Default: `http://localhost:5000`. |
| `NEXT_PUBLIC_WLTR_DIRECT_API` | Client | Set to `true` to call the API from the browser **directly** instead of `/api/wltr`. Requires the API to allow your origin (CORS) and to accept the auth pattern the app uses (Bearer + refresh in `sessionStorage` when applicable). |
| `NEXT_PUBLIC_WLTR_API_BASE_URL` | Client | Used when `NEXT_PUBLIC_WLTR_DIRECT_API=true`. Full API base including `/api`. Default: `http://localhost:5000/api`. |

**Typical local setup:** leave direct API off; ensure the WLTR API is reachable at `WLTR_API_ORIGIN` so the Next.js route can proxy `/api/wltr/*` to `{WLTR_API_ORIGIN}/api/*`.

**Production behind one hostname:** deploy the app, set `WLTR_API_ORIGIN` to your internal or public API origin (e.g. `https://api.example.com`). Clients use same origin; cookies for refresh can work with the BFF.

## Run locally (development)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Hot reload is enabled.

## Build and run (production-style)

```bash
npm run build
npm run start
```

By default the server listens on **port 3000**. Override with the standard Next.js / Node convention, for example:

```bash
set PORT=8080
npm run start
```

On Unix:

```bash
PORT=8080 npm run start
```

For a real deployment, run `npm run build` in CI or on the host, then `npm run start` under a process manager (systemd, PM2, Docker, Kubernetes, etc.) with `WLTR_API_ORIGIN` (and any `NEXT_PUBLIC_*` vars) set for that environment.

## Other scripts

| Command | Description |
|---------|-------------|
| `npm run lint` | ESLint |
| `npm test` | Vitest (once) |
| `npm run test:watch` | Vitest watch mode |
| `npm run generate:api-types` | Regenerates `openapi/wltr.openapi.json` stub and `src/lib/types/api.d.ts` from `scripts/generate-openapi-stub.mjs` |

## API types

OpenAPI-driven types are generated from the stub script, not from a live server. After changing `scripts/generate-openapi-stub.mjs`, run `npm run generate:api-types` and fix any TypeScript fallout if you consume the new paths.
