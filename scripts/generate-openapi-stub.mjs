import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

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
  "/api/instruments/{id}": ["get"],
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
  "/api/calibration-groups/{id}/internal-standard-summaries": ["get"],
  "/api/Users": ["get"],
  "/api/Users/{userId}/deactivate": ["put"],
  "/api/Users/{userId}/reactivate": ["put"],
  "/": ["get"],
};

const doc = {
  openapi: "3.0.4",
  info: { title: "WLTR API", version: "v1" },
  paths: {},
  components: {
    schemas: {
      JsonObject: { type: "object", additionalProperties: true },
      Paged: {
        type: "object",
        properties: {
          items: { type: "array", items: { $ref: "#/components/schemas/JsonObject" } },
          totalCount: { type: "integer" },
          page: { type: "integer" },
          pageSize: { type: "integer" },
        },
      },
    },
  },
};

for (const [p, methods] of Object.entries(paths)) {
  doc.paths[p] = {};
  for (const m of methods) {
    const op = {
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
        400: {
          description: "Bad Request",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/JsonObject" } },
            "application/problem+json": { schema: { $ref: "#/components/schemas/JsonObject" } },
          },
        },
        401: {
          description: "Unauthorized",
          content: { "application/json": { schema: { $ref: "#/components/schemas/JsonObject" } } },
        },
        403: {
          description: "Forbidden",
          content: { "application/json": { schema: { $ref: "#/components/schemas/JsonObject" } } },
        },
        404: {
          description: "Not Found",
          content: { "application/json": { schema: { $ref: "#/components/schemas/JsonObject" } } },
        },
        409: {
          description: "Conflict",
          content: { "application/json": { schema: { $ref: "#/components/schemas/JsonObject" } } },
        },
        429: {
          description: "Too Many Requests",
          content: { "application/json": { schema: { $ref: "#/components/schemas/JsonObject" } } },
        },
      },
    };
    const parameters = [];
    if (p.includes("{")) {
      const segs = p.match(/\{([^}]+)\}/g) || [];
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
    if (m === "get" && p === "/api/analytes/suggestions") {
      parameters.push(
        { name: "rawName", in: "query", schema: { type: "string" } },
        { name: "top", in: "query", schema: { type: "integer" } },
      );
    } else if (m === "get" && p === "/api/internal-standards") {
      /* bare array response — no paging query params */
    } else if (
      m === "get" &&
      (p === "/api/runs/{id}/internal-standard-summaries" ||
        p === "/api/calibration-groups/{id}/internal-standard-summaries")
    ) {
      parameters.push(
        { name: "laboratoryId", in: "query", schema: { type: "string", format: "uuid" } },
        { name: "methodConfigId", in: "query", schema: { type: "string", format: "uuid" } },
        { name: "format", in: "query", schema: { type: "string" } },
      );
    } else if (m === "get" && p === "/api/calibration-groups/{id}/readiness") {
      parameters.push({ name: "laboratoryId", in: "query", schema: { type: "string", format: "uuid" } });
    } else if (m === "get" && p === "/api/calibration-groups/candidates") {
      parameters.push({ name: "instrumentId", in: "query", schema: { type: "string", format: "uuid" } });
    } else if (m === "get" && p !== "/") {
      parameters.push(
        { name: "page", in: "query", schema: { type: "integer" } },
        { name: "pageSize", in: "query", schema: { type: "integer" } },
        { name: "sort", in: "query", schema: { type: "string" } },
      );
      if (p.startsWith("/api/Roles") || p.startsWith("/api/Users")) {
        parameters.push({ name: "laboratoryId", in: "query", schema: { type: "string", format: "uuid" } });
      }
      if (p === "/api/runs") {
        parameters.push(
          { name: "instrumentId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "runType", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
        );
      }
      if (p === "/api/calibration-groups") {
        parameters.push({ name: "laboratoryId", in: "query", schema: { type: "string", format: "uuid" } });
      }
    }
    if (parameters.length) op.parameters = parameters;
    if (["post", "put", "delete"].includes(m)) {
      op.requestBody = {
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/JsonObject" } },
        },
      };
    }
    if (m === "get" && p === "/") {
      op.responses[200].content = { "text/plain": { schema: { type: "string" } } };
    }
    doc.paths[p][m] = op;
  }
}

fs.mkdirSync(path.join(root, "openapi"), { recursive: true });
fs.writeFileSync(path.join(root, "openapi", "wltr.openapi.json"), JSON.stringify(doc, null, 2));
