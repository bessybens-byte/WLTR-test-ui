/**
 * Applies incremental schema/path updates when the backend OpenAPI export drifts.
 * Run: node scripts/patch-openapi-calibration.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "openapi", "wltr.openapi.source.json");

const doc = JSON.parse(fs.readFileSync(src, "utf8"));
const schemas = doc.components.schemas;

function ensureNameProperty(schema, description) {
  if (!schema?.properties) return;
  if (!schema.properties.name) {
    schema.properties.name = {
      type: "string",
      description,
      nullable: true,
    };
  }
}

ensureNameProperty(schemas.CalibrationGroupDetailResponse, "User-assigned display name.");
ensureNameProperty(schemas.CalibrationGroupListItemResponse, "User-assigned display name.");
ensureNameProperty(schemas.CreateCalibrationGroupRequest, "User-assigned display name for the group.");
ensureNameProperty(schemas.UpdateCalibrationGroupRequest, "User-assigned display name for the group.");

if (!schemas.QuantitationMode) {
  schemas.QuantitationMode = {
    enum: [0, 1],
    type: "integer",
    format: "int32",
    description: "0 = InternalStandard (response ratio), 1 = ExternalStandard (raw response).",
  };
}

for (const key of [
  "CreateMethodConfigRequest",
  "UpdateMethodConfigRequest",
  "MethodConfigDetailDto",
  "MethodConfigSnapshotDto",
]) {
  const s = schemas[key];
  if (s?.properties && !s.properties.quantitationMode) {
    s.properties.quantitationMode = { $ref: "#/components/schemas/QuantitationMode" };
  }
}

if (!schemas.ReplaceExcludedAnalytesRequest) {
  schemas.ReplaceExcludedAnalytesRequest = {
    type: "object",
    properties: {
      analyteIds: {
        type: "array",
        items: { type: "string", format: "uuid" },
        description:
          "Canonical analyte identifiers that should comprise the group's full exclusion list.",
        nullable: true,
      },
      note: {
        type: "string",
        description: "Optional note applied to every analyte newly added to the exclusion list by this request.",
        nullable: true,
      },
    },
    additionalProperties: false,
    description: "Request body for replacing a calibration group's entire analyte exclusion list in one call.",
  };
}

const excludedPath = "/api/calibration-groups/{id}/excluded-analytes";
if (!doc.paths[excludedPath]?.put) {
  doc.paths[excludedPath].put = {
    tags: ["Calibration groups"],
    summary:
      "Replaces the calibration group's entire analyte exclusion list in a single request.",
    description:
      "Pass an empty `analyteIds` array to clear all exclusions. Marks the group computation-stale when the set changes.",
    parameters: [
      {
        name: "id",
        in: "path",
        description: "Calibration group identifier.",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
    ],
    requestBody: {
      description: "Full set of analytes to exclude and an optional shared note.",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ReplaceExcludedAnalytesRequest" },
        },
      },
    },
    responses: {
      "204": { description: "No Content" },
      "400": {
        description: "Bad Request",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } },
      },
      "401": {
        description: "Unauthorized",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } },
      },
      "403": {
        description: "Forbidden",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } },
      },
      "404": {
        description: "Not Found",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } },
      },
      "409": {
        description: "Conflict",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } },
      },
    },
  };
}

const detail = schemas.CalibrationGroupDetailResponse;
if (detail?.properties) {
  if (!detail.properties.selectedRegressionType) {
    detail.properties.selectedRegressionType = {
      type: "integer",
      format: "int32",
      description: "Regression type of the analyst-selected model variant; null until POST select-model.",
      nullable: true,
    };
  }
  if (!detail.properties.selectedWeightingMode) {
    detail.properties.selectedWeightingMode = {
      $ref: "#/components/schemas/WeightingMode",
      description: "Weighting mode of the analyst-selected model variant; null until POST select-model.",
      nullable: true,
    };
  }
}

const variantResultProps = {
  regressionType: { $ref: "#/components/schemas/RegressionType" },
  weightingMode: { $ref: "#/components/schemas/WeightingMode" },
  passCount: { type: "integer", format: "int32", description: "Number of acceptance criteria passed." },
  reportCardScore: { type: "integer", format: "int32", description: "Composite report-card score.", nullable: true },
  rSquared: { type: "number", format: "double", nullable: true },
  calStatus: { type: "integer", format: "int32", description: "0 = fail, 1 = pass.", nullable: true },
  icvPassed: { type: "boolean", nullable: true },
};

if (!schemas.CalibrationVariantResultDto) {
  schemas.CalibrationVariantResultDto = {
    type: "object",
    properties: variantResultProps,
    additionalProperties: false,
  };
}

if (!schemas.CalibrationReportCardAnalyteDto) {
  schemas.CalibrationReportCardAnalyteDto = {
    type: "object",
    properties: {
      analyteId: { type: "string", format: "uuid" },
      analyteName: { type: "string", nullable: true },
      variants: {
        type: "array",
        items: { $ref: "#/components/schemas/CalibrationVariantResultDto" },
        nullable: true,
      },
    },
    additionalProperties: false,
  };
}

if (!schemas.CalibrationReportCardResponse) {
  schemas.CalibrationReportCardResponse = {
    type: "object",
    properties: {
      calibrationGroupId: { type: "string", format: "uuid" },
      suggestedModel: { $ref: "#/components/schemas/CalibrationVariantResultDto", nullable: true },
      analytes: {
        type: "array",
        items: { $ref: "#/components/schemas/CalibrationReportCardAnalyteDto" },
        nullable: true,
      },
      isComputationStale: { type: "boolean" },
    },
    additionalProperties: false,
  };
}

if (!schemas.SelectCalibrationModelRequest) {
  schemas.SelectCalibrationModelRequest = {
    type: "object",
    properties: {
      regressionType: { $ref: "#/components/schemas/RegressionType" },
      weightingMode: { $ref: "#/components/schemas/WeightingMode" },
    },
    additionalProperties: false,
    description: "Regression variant to use for the group's approved summary.",
  };
}

if (!schemas.CalibrationGroupDecisionRequest) {
  schemas.CalibrationGroupDecisionRequest = {
    type: "object",
    properties: {
      comment: { type: "string", description: "Optional QA note stored in the audit trail.", nullable: true },
    },
    additionalProperties: false,
  };
}

const groupIdParam = {
  name: "id",
  in: "path",
  description: "Calibration group identifier.",
  required: true,
  schema: { type: "string", format: "uuid" },
};

const variantQueryParams = [
  {
    name: "regressionType",
    in: "query",
    description:
      "Regression type of the variant to load. When omitted, returns the group-selected variant or the snapshot default.",
    schema: { $ref: "#/components/schemas/RegressionType" },
  },
  {
    name: "weightingMode",
    in: "query",
    description: "Weighting mode of the variant to load. Must be supplied together with regressionType when filtering.",
    schema: { $ref: "#/components/schemas/WeightingMode" },
  },
];

function ensureVariantQueryParams(pathKey) {
  const op = doc.paths[pathKey]?.get;
  if (!op) return;
  op.parameters = op.parameters ?? [];
  for (const p of variantQueryParams) {
    if (!op.parameters.some((existing) => existing.name === p.name)) {
      op.parameters.push(p);
    }
  }
  if (op.description && !op.description.includes("regressionType")) {
    op.description +=
      "\r\n\r\n<strong>Variant filter:</strong> pass optional `regressionType` and `weightingMode` query parameters to load a specific computed variant. When omitted, the group-selected model is used when set.";
  }
}

ensureVariantQueryParams("/api/calibration-groups/{id}/regression-inputs");
ensureVariantQueryParams("/api/calibration-groups/{id}/analytes/{analyteId}/chart");
ensureVariantQueryParams("/api/calibration-groups/{id}/analytes/{analyteId}/regression-debug");

const problemResponses = {
  "400": {
    description: "Bad Request",
    content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } },
  },
  "401": {
    description: "Unauthorized",
    content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } },
  },
  "403": {
    description: "Forbidden",
    content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } },
  },
  "404": {
    description: "Not Found",
    content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } },
  },
  "409": {
    description: "Conflict",
    content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } },
  },
};

if (!doc.paths["/api/calibration-groups/{id}/report-card"]) {
  doc.paths["/api/calibration-groups/{id}/report-card"] = {
    get: {
      tags: ["Calibration groups"],
      summary: "Report card ranking all computed regression variants by pass-count.",
      description:
        "Returns per-analyte variant acceptance results and the suggested model (highest pass-count). Requires `perm.view`.",
      parameters: [groupIdParam],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CalibrationReportCardResponse" },
            },
          },
        },
        ...problemResponses,
      },
    },
  };
}

if (!doc.paths["/api/calibration-groups/{id}/select-model"]) {
  doc.paths["/api/calibration-groups/{id}/select-model"] = {
    post: {
      tags: ["Calibration groups"],
      summary: "Select the regression variant for this calibration group.",
      description: "Requires `perm.runs.upload`. Group must be Computed and not stale.",
      parameters: [groupIdParam],
      requestBody: {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SelectCalibrationModelRequest" },
          },
        },
      },
      responses: {
        "204": { description: "No Content" },
        ...problemResponses,
      },
    },
  };
}

if (!doc.paths["/api/calibration-groups/{id}/approve"]) {
  doc.paths["/api/calibration-groups/{id}/approve"] = {
    post: {
      tags: ["Calibration groups"],
      summary: "Approve a computed calibration group.",
      description:
        "Locks the group for reporting. Requires `perm.groups.approve`, a selected model, and fresh compute (not stale).",
      parameters: [groupIdParam],
      requestBody: {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CalibrationGroupDecisionRequest" },
          },
        },
      },
      responses: {
        "204": { description: "No Content" },
        ...problemResponses,
      },
    },
  };
}

if (!doc.paths["/api/calibration-groups/{id}/reject"]) {
  doc.paths["/api/calibration-groups/{id}/reject"] = {
    post: {
      tags: ["Calibration groups"],
      summary: "Reject a computed calibration group.",
      description: "Terminal QA decision. Requires `perm.groups.approve`.",
      parameters: [groupIdParam],
      requestBody: {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CalibrationGroupDecisionRequest" },
          },
        },
      },
      responses: {
        "204": { description: "No Content" },
        ...problemResponses,
      },
    },
  };
}

if (!schemas.AnalyteRefDto) {
  schemas.AnalyteRefDto = {
    type: "object",
    properties: {
      id: {
        type: "string",
        format: "uuid",
        description: "Canonical analyte identifier.",
      },
      name: {
        type: "string",
        description: "Display name.",
        nullable: true,
      },
    },
    additionalProperties: false,
    description: "Minimal analyte reference embedded in other DTOs.",
  };
}

const analyteDetail = schemas.AnalyteDetailDto;
if (analyteDetail?.properties && !analyteDetail.properties.defaultInternalStandardName) {
  analyteDetail.properties.defaultInternalStandardName = {
    type: "string",
    description:
      "Resolved display name of the default internal standard; null when `defaultInternalStandardId` is unset.",
    nullable: true,
  };
}

const isDetail = schemas.InternalStandardDetailDto;
if (isDetail?.properties && !isDetail.properties.analytes) {
  isDetail.properties.analytes = {
    type: "array",
    items: { $ref: "#/components/schemas/AnalyteRefDto" },
    description:
      "Canonical analytes in this laboratory that reference this internal standard via `defaultInternalStandardId`.",
    nullable: true,
  };
}

fs.writeFileSync(src, `${JSON.stringify(doc, null, 2)}\n`);
console.log("Patched", path.relative(root, src));
