import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const DEFAULT_SOURCE = path.join(root, "openapi", "wltr.openapi.source.json");
const OUT = path.join(root, "openapi", "wltr.openapi.json");

function readSourcePath() {
  const fromEnv = process.env.WLTR_OPENAPI_PATH?.trim();
  if (fromEnv) return path.isAbsolute(fromEnv) ? fromEnv : path.join(root, fromEnv);
  return DEFAULT_SOURCE;
}

function copyRichOpenApi() {
  const src = readSourcePath();
  if (!fs.existsSync(src)) return false;
  let raw;
  try {
    raw = fs.readFileSync(src, "utf8");
  } catch (e) {
    console.error(`WLTR OpenAPI: failed to read ${src}:`, e.message);
    process.exit(1);
  }
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (e) {
    console.error(`WLTR OpenAPI: invalid JSON in ${src}:`, e.message);
    process.exit(1);
  }
  if (!doc.openapi || String(doc.openapi).startsWith("3") === false) {
    console.error(`WLTR OpenAPI: ${src} must be an OpenAPI 3.x document (missing or invalid "openapi").`);
    process.exit(1);
  }
  if (!doc.paths || typeof doc.paths !== "object") {
    console.error(`WLTR OpenAPI: ${src} must declare a "paths" object.`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(doc, null, 2));
  console.log(`WLTR OpenAPI: wrote ${path.relative(root, OUT)} from ${path.relative(root, src)}`);
  return true;
}

const paths = {
  "/api/analytes": ["get", "post"],
  "/api/analytes/suggestions": ["get"],
  "/api/analytes/unresolved": ["get"],
  "/api/analytes/{id}": ["get", "put", "delete"],
  "/api/analytes/{analyteId}/aliases": ["post"],
  "/api/analytes/aliases/{aliasId}": ["put", "delete"],
  "/api/Auth/me": ["get", "put"],
  "/api/Auth/change-password": ["post"],
  "/api/Auth/accept-invite": ["post"],
  "/api/Auth/login": ["post"],
  "/api/Auth/refresh": ["post"],
  "/api/Auth/logout": ["post"],
  "/api/Auth/forgot-password": ["post"],
  "/api/Auth/reset-password": ["post"],
  "/api/calibration-levels": ["get", "post"],
  "/api/calibration-levels/{id}": ["get", "put", "delete"],
  "/api/instruments": ["get", "post"],
  "/api/instruments/{id}": ["get", "put", "delete"],
  "/api/instruments/{id}/suppressed-analytes": ["get", "post"],
  "/api/instruments/{id}/suppressed-analytes/{analyteId}": ["delete"],
  "/api/internal-standards": ["get", "post"],
  "/api/internal-standards/{id}": ["get", "put", "delete"],
  "/api/Invitations": ["post"],
  "/api/LabTechnicians": ["get", "post"],
  "/api/LabTechnicians/{id}": ["get", "put"],
  "/api/LabTechnicians/me": ["get"],
  "/api/Laboratories": ["get", "post"],
  "/api/Laboratories/{id}": ["get", "put"],
  "/api/method-configs": ["get", "post"],
  "/api/method-configs/{id}": ["get", "put", "delete"],
  "/api/method-configs/{id}/snapshots": ["get"],
  "/api/method-configs/{id}/snapshots/{version}": ["get"],
  "/api/Roles": ["get", "post"],
  "/api/Roles/{roleId}/name": ["put"],
  "/api/Roles/{roleId}/permissions": ["put"],
  "/api/Roles/{roleId}": ["delete"],
  "/api/Roles/assignments": ["post", "delete"],
  "/api/runs": ["get", "post"],
  "/api/runs/{id}": ["get", "delete"],
  "/api/runs/{id}/measurements": ["get"],
  "/api/runs/{id}/validation": ["get"],
  "/api/runs/{id}/internal-standard-summaries": ["get"],
  "/api/runs/{id}/analyte-mapping/resolve": ["post"],
  "/api/calibration-groups": ["get", "post"],
  "/api/calibration-groups/candidates": ["get"],
  "/api/calibration-groups/{id}": ["get", "put"],
  "/api/calibration-groups/{id}/readiness": ["get"],
  "/api/calibration-groups/{id}/regression-inputs": ["get"],
  "/api/calibration-groups/{id}/compute": ["post"],
  "/api/calibration-groups/{id}/analytes/{analyteId}/regression-debug": ["get"],
  "/api/calibration-groups/{id}/analytes/{analyteId}/chart": ["get"],
  "/api/calibration-groups/{id}/internal-standard-summaries": ["get"],
  "/api/calibration-groups/{id}/points/{pointId}/exclude": ["post", "delete"],
  "/api/calibration-groups/{id}/excluded-analytes": ["get", "post"],
  "/api/calibration-groups/{id}/excluded-analytes/{analyteId}": ["delete"],
  "/api/Users": ["get"],
  "/api/Users/{userId}": ["get"],
  "/api/Users/{userId}/deactivate": ["put"],
  "/api/Users/{userId}/reactivate": ["put"],
  "/": ["get"],
};

const TAGS = [
  {
    name: "Analytes",
    description: "HTTP API for laboratory-scoped canonical analytes and raw-name aliases.",
  },
  {
    name: "Authentication",
    description: "Authentication, account-recovery, and self-service profile endpoints.",
  },
  {
    name: "Calibration groups",
    description:
      "HTTP API for calibration groups: draft assembly, readiness, internal-standard summaries, and regression input previews.",
  },
  {
    name: "Calibration levels",
    description: "HTTP API for laboratory-scoped calibration levels (true concentration reference data).",
  },
  { name: "Instruments", description: "HTTP API for laboratory instruments." },
  {
    name: "Internal standards",
    description: "HTTP API for laboratory-scoped internal standards (catalog CRUD for analyte default IS pickers).",
  },
  { name: "Invitations", description: "Creates one-time invitations for new users to join a laboratory." },
  { name: "Lab technicians", description: "HTTP API for lab technician profiles." },
  { name: "Laboratories", description: "HTTP API for laboratory creation, configuration, and listing." },
  {
    name: "Method configuration",
    description: "HTTP API for laboratory-scoped method configurations and their immutable version snapshots.",
  },
  { name: "Roles", description: "Laboratory-scoped role and permission administration endpoints." },
  { name: "Runs", description: "HTTP API for calibration run uploads and run metadata/measurement reads." },
  { name: "Users", description: "Laboratory-scoped user administration endpoints." },
  { name: "Wltr.Api", description: "Host metadata and health-style entry points." },
];

const INFO_DESCRIPTION = [
  "WLTR exposes a JSON REST API for calibration analytics and laboratory administration.",
  "",
  "Base path: `/api`. Most successful responses are `application/json`. Internal-standard summary endpoints also support `text/csv` when you pass `format=csv`.",
  "",
  "Authentication: JWT bearer access tokens from `POST /api/Auth/login`; rotate with `POST /api/Auth/refresh`; revoke refresh with `POST /api/Auth/logout`.",
  "",
  "Errors: failures return RFC 7807 ProblemDetails (`application/problem+json`) with `title`, `status`, `detail`, and `instance` where applicable.",
  "",
  "Pagination: list routes return `{ items, totalCount, page, pageSize }` with optional `sort`. Some routes return bare JSON arrays (for example `GET /api/internal-standards`).",
  "",
  "This file is generated for the web client. Drop a backend-exported document at `openapi/wltr.openapi.source.json` (or set `WLTR_OPENAPI_PATH`) before `npm run generate:api-types` to emit fully typed operations instead of this stub.",
].join("\n");

/** Routes that must not receive generic list paging (`page`, `pageSize`, `sort`). */
const GET_NO_LIST_QUERIES = new Set([
  "/api/internal-standards",
  "/api/analytes/unresolved",
  "/api/LabTechnicians/me",
  "/api/runs/{id}/measurements",
  "/api/runs/{id}/validation",
  "/api/calibration-groups/{id}/regression-inputs",
  "/api/method-configs/{id}/snapshots/{version}",
]);

function openapiTag(routePath) {
  if (routePath === "/") return "Wltr.Api";
  if (routePath.startsWith("/api/analytes")) return "Analytes";
  if (routePath.startsWith("/api/Auth")) return "Authentication";
  if (routePath.startsWith("/api/calibration-groups")) return "Calibration groups";
  if (routePath.startsWith("/api/calibration-levels")) return "Calibration levels";
  if (routePath.startsWith("/api/instruments")) return "Instruments";
  if (routePath.startsWith("/api/internal-standards")) return "Internal standards";
  if (routePath.startsWith("/api/Invitations")) return "Invitations";
  if (routePath.startsWith("/api/LabTechnicians")) return "Lab technicians";
  if (routePath.startsWith("/api/Laboratories")) return "Laboratories";
  if (routePath.startsWith("/api/method-configs")) return "Method configuration";
  if (routePath.startsWith("/api/Roles")) return "Roles";
  if (routePath.startsWith("/api/runs")) return "Runs";
  if (routePath.startsWith("/api/Users")) return "Users";
  return "Wltr.Api";
}

function inferSummary(method, routePath) {
  if (routePath === "/") return "Host metadata (plain text).";
  const tail = routePath.replace(/^\/api\//, "").replace(/\//g, " / ");
  return `${method.toUpperCase()} /api/${tail}`;
}

function isAnonymousAuthRoute(routePath, method) {
  return (
    method === "post" &&
    ["/api/Auth/login", "/api/Auth/refresh", "/api/Auth/forgot-password", "/api/Auth/reset-password", "/api/Auth/accept-invite"].includes(
      routePath,
    )
  );
}

function problemContent() {
  return {
    "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } },
    "application/problem+json": { schema: { $ref: "#/components/schemas/ProblemDetails" } },
  };
}

function buildQueryParameters(method, routePath) {
  const parameters = [];
  if (routePath.includes("{")) {
    const segs = routePath.match(/\{([^}]+)\}/g) || [];
    for (const s of segs) {
      const name = s.slice(1, -1);
      parameters.push({
        name,
        in: "path",
        required: true,
        schema: name === "version" ? { type: "integer" } : { type: "string", format: "uuid" },
      });
    }
  }
  if (method !== "get") return parameters;

  if (routePath === "/") return parameters;

  if (routePath === "/api/analytes/suggestions") {
    parameters.push(
      { name: "rawName", in: "query", schema: { type: "string" } },
      { name: "top", in: "query", schema: { type: "integer", minimum: 1, maximum: 32 } },
    );
    return parameters;
  }

  if (routePath === "/api/calibration-groups/{id}/analytes/{analyteId}/regression-debug") {
    parameters.push({ name: "laboratoryId", in: "query", schema: { type: "string", format: "uuid" } });
    return parameters;
  }

  if (routePath === "/api/calibration-groups/{id}/analytes/{analyteId}/chart") {
    parameters.push({ name: "laboratoryId", in: "query", schema: { type: "string", format: "uuid" } });
    return parameters;
  }

  if (routePath === "/api/internal-standards" || GET_NO_LIST_QUERIES.has(routePath)) {
    return parameters;
  }

  if (
    routePath === "/api/runs/{id}/internal-standard-summaries" ||
    routePath === "/api/calibration-groups/{id}/internal-standard-summaries"
  ) {
    parameters.push(
      { name: "laboratoryId", in: "query", schema: { type: "string", format: "uuid" } },
      { name: "methodConfigId", in: "query", schema: { type: "string", format: "uuid" } },
      { name: "format", in: "query", schema: { type: "string", description: "Use `csv` (case-insensitive) for UTF-8 CSV; otherwise JSON." } },
    );
    return parameters;
  }

  if (routePath === "/api/calibration-groups/{id}/readiness") {
    parameters.push({ name: "laboratoryId", in: "query", schema: { type: "string", format: "uuid" } });
    return parameters;
  }

  if (routePath === "/api/calibration-groups/candidates") {
    parameters.push({
      name: "instrumentId",
      in: "query",
      required: true,
      schema: { type: "string", format: "uuid" },
    });
    return parameters;
  }

  if (routePath === "/api/method-configs/{id}/snapshots") {
    parameters.push(
      { name: "page", in: "query", schema: { type: "integer", format: "int32" } },
      { name: "pageSize", in: "query", schema: { type: "integer", format: "int32" } },
    );
    return parameters;
  }

  parameters.push(
    { name: "page", in: "query", schema: { type: "integer", format: "int32" } },
    { name: "pageSize", in: "query", schema: { type: "integer", format: "int32" } },
    { name: "sort", in: "query", schema: { type: "string" } },
  );
  if (routePath.startsWith("/api/Roles") || routePath.startsWith("/api/Users")) {
    parameters.push({ name: "laboratoryId", in: "query", schema: { type: "string", format: "uuid" } });
  }
  if (routePath === "/api/runs") {
    parameters.push(
      { name: "instrumentId", in: "query", schema: { type: "string", format: "uuid" } },
      { name: "runType", in: "query", schema: { type: "string" } },
      { name: "status", in: "query", schema: { type: "string" } },
    );
  }
  if (routePath === "/api/calibration-groups") {
    parameters.push({ name: "laboratoryId", in: "query", schema: { type: "string", format: "uuid" } });
  }
  return parameters;
}

function buildStubDocument() {
  const doc = {
    openapi: "3.0.4",
    info: {
      title: "WLTR API",
      version: "v1",
      description: INFO_DESCRIPTION,
      contact: { name: "WLTR" },
    },
    tags: TAGS,
    security: [{ Bearer: [] }],
    paths: {},
    components: {
      securitySchemes: {
        Bearer: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Obtain a JWT from POST /api/Auth/login (or refresh via POST /api/Auth/refresh). Send Authorization: Bearer {accessToken}.",
        },
      },
      schemas: {
        JsonObject: { type: "object", additionalProperties: true },
        ProblemDetails: {
          type: "object",
          properties: {
            type: { type: "string", nullable: true },
            title: { type: "string", nullable: true },
            status: { type: "integer", format: "int32", nullable: true },
            detail: { type: "string", nullable: true },
            instance: { type: "string", nullable: true },
          },
          additionalProperties: true,
        },
        Paged: {
          type: "object",
          properties: {
            items: { type: "array", items: { $ref: "#/components/schemas/JsonObject" } },
            totalCount: { type: "integer", format: "int32" },
            page: { type: "integer", format: "int32" },
            pageSize: { type: "integer", format: "int32" },
          },
        },
      },
    },
  };

  for (const [routePath, methods] of Object.entries(paths)) {
    doc.paths[routePath] = {};
    for (const m of methods) {
      const op = {
        tags: [openapiTag(routePath)],
        summary: inferSummary(m, routePath),
        responses: {
          200: {
            description: "OK",
            content: { "application/json": { schema: { $ref: "#/components/schemas/JsonObject" } } },
          },
          201: {
            description: "Created",
            content: { "application/json": { schema: { $ref: "#/components/schemas/JsonObject" } } },
          },
          204: { description: "No Content" },
          400: { description: "Bad Request", content: problemContent() },
          401: {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } },
          },
          404: {
            description: "Not Found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } },
          },
          409: {
            description: "Conflict",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } },
          },
          429: {
            description: "Too Many Requests",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } },
          },
        },
      };

      if (isAnonymousAuthRoute(routePath, m) || (routePath === "/" && m === "get")) {
        op.security = [];
      }

      const parameters = buildQueryParameters(m, routePath);
      if (parameters.length) op.parameters = parameters;

      if (["post", "put"].includes(m)) {
        op.requestBody = {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/JsonObject" } },
          },
        };
      }

      if (m === "post" && routePath === "/api/calibration-groups/{id}/compute") {
        delete op.requestBody;
      }

      if (m === "get" && routePath === "/") {
        op.responses["200"].content = { "text/plain": { schema: { type: "string" } } };
      }

      if (
        m === "get" &&
        (routePath === "/api/runs/{id}/internal-standard-summaries" ||
          routePath === "/api/calibration-groups/{id}/internal-standard-summaries")
      ) {
        op.responses["200"].content["text/csv"] = {
          schema: { type: "string", description: "UTF-8 CSV export when format=csv." },
        };
      }

      doc.paths[routePath][m] = op;
    }
  }

  return doc;
}

if (copyRichOpenApi()) {
  process.exit(0);
}

const doc = buildStubDocument();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(doc, null, 2));
console.log(
  `WLTR OpenAPI: wrote ${path.relative(root, OUT)} (stub). For full schemas, add openapi/wltr.openapi.source.json or set WLTR_OPENAPI_PATH.`,
);
