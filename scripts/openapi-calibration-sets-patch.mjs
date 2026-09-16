/**
 * Calibration level sets — in-memory OpenAPI patch.
 *
 * The backend Swagger export at `openapi/wltr.openapi.source.json` predates the
 * calibration level sets feature. Until the backend is re-exported, `generate-openapi.mjs`
 * applies this idempotent patch to the parsed document before writing
 * `openapi/wltr.openapi.json`, so the generated client types reflect the new API:
 *
 * - `GET/POST /api/calibration-level-sets`
 * - `GET/PUT/DELETE /api/calibration-level-sets/{id}`
 * - `PUT /api/calibration-level-sets/{id}/active`
 * - `GET/POST /api/calibration-level-sets/{setId}/levels`
 * - `GET/PUT/DELETE /api/calibration-level-sets/{setId}/levels/{id}`
 * - `calibrationLevelSetId` on method-config and run create/update requests
 *
 * Every step is guarded, so applying it to an already-current export is a no-op.
 */

/** @param {Record<string, unknown>} doc */
export function applyCalibrationSetsPatch(doc) {
  const schemas = doc.components?.schemas ?? {};

  // Drop the flat calibration-levels routes (now nested under sets).
  delete doc.paths?.["/api/calibration-levels"];
  delete doc.paths?.["/api/calibration-levels/{id}"];

  // Calibration level DTOs: set-scoped + concurrency token.
  const levelDetail = schemas.CalibrationLevelDetailDto;
  if (levelDetail?.properties) {
    delete levelDetail.properties.laboratoryId;
    if (!levelDetail.properties.calibrationLevelSetId) {
      levelDetail.properties.calibrationLevelSetId = { type: "string", format: "uuid" };
    }
    if (!levelDetail.properties.rowVersion) {
      levelDetail.properties.rowVersion = {
        type: "string",
        format: "byte",
        description: "Concurrency token that an update must echo back.",
      };
    }
  }

  const levelListItem = schemas.CalibrationLevelListItemDto;
  if (levelListItem?.properties && !levelListItem.properties.calibrationLevelSetId) {
    levelListItem.properties.calibrationLevelSetId = { type: "string", format: "uuid" };
  }

  const updateLevel = schemas.UpdateCalibrationLevelRequest;
  if (updateLevel?.properties && !updateLevel.properties.rowVersion) {
    updateLevel.properties.rowVersion = {
      type: "string",
      format: "byte",
      description: "Concurrency token from the last read of the level.",
      nullable: true,
    };
  }

  // `calibrationLevelSetId` on method-config and run requests.
  for (const key of ["CreateMethodConfigRequest", "UpdateMethodConfigRequest"]) {
    const s = schemas[key];
    if (s?.properties && !s.properties.calibrationLevelSetId) {
      s.properties.calibrationLevelSetId = {
        type: "string",
        format: "uuid",
        description:
          "Calibration level set this configuration evaluates against; must belong to the same department as the config.",
      };
    }
  }

  const createRun = schemas.CreateRunRequest;
  if (createRun?.properties && !createRun.properties.calibrationLevelSetId) {
    createRun.properties.calibrationLevelSetId = {
      type: "string",
      format: "uuid",
      description: "Calibration level set that owns the level. Required for CAL runs; ignored for ICV.",
      nullable: true,
    };
  }

  addSchemas(schemas);
  insertSetPaths(doc);
  addTags(doc);
}

function addSchemas(schemas) {
  const byteRowVersion = { type: "string", format: "byte", nullable: true };

  if (!schemas.CalibrationLevelSetListItemDto) {
    schemas.CalibrationLevelSetListItemDto = {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        laboratoryId: { type: "string", format: "uuid" },
        departmentId: { type: "string", format: "uuid" },
        departmentName: { type: "string", nullable: true },
        name: { type: "string", nullable: true },
        isActive: { type: "boolean" },
      },
      additionalProperties: false,
      description: "Lightweight projection for calibration level set list responses.",
    };
  } else if (schemas.CalibrationLevelSetListItemDto.properties && !schemas.CalibrationLevelSetListItemDto.properties.departmentName) {
    schemas.CalibrationLevelSetListItemDto.properties.departmentName = { type: "string", nullable: true };
  }

  if (!schemas.CalibrationLevelSetDetailDto) {
    schemas.CalibrationLevelSetDetailDto = {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        laboratoryId: { type: "string", format: "uuid" },
        departmentId: { type: "string", format: "uuid" },
        departmentName: { type: "string", nullable: true },
        name: { type: "string", nullable: true },
        isActive: { type: "boolean" },
        rowVersion: { type: "string", format: "byte" },
        createdAt: { type: "string", format: "date-time" },
        createdBy: { type: "string", nullable: true },
        updatedAt: { type: "string", format: "date-time", nullable: true },
        updatedBy: { type: "string", nullable: true },
      },
      additionalProperties: false,
      description: "Full detail projection for a single calibration level set.",
    };
  } else if (schemas.CalibrationLevelSetDetailDto.properties && !schemas.CalibrationLevelSetDetailDto.properties.departmentName) {
    schemas.CalibrationLevelSetDetailDto.properties.departmentName = { type: "string", nullable: true };
  }

  if (!schemas.CreateCalibrationLevelSetRequest) {
    schemas.CreateCalibrationLevelSetRequest = {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Display name; unique within the department after normalization.",
          nullable: true,
        },
        departmentId: {
          type: "string",
          format: "uuid",
          description: "Owning department; inferred for single-department labs.",
          nullable: true,
        },
      },
      additionalProperties: false,
      description: "Request body for creating a department-scoped calibration level set.",
    };
  }

  if (!schemas.UpdateCalibrationLevelSetRequest) {
    schemas.UpdateCalibrationLevelSetRequest = {
      type: "object",
      properties: {
        name: { type: "string", description: "New display name; unique within the set's department.", nullable: true },
        rowVersion: byteRowVersion,
      },
      additionalProperties: false,
      description: "Request body for renaming a calibration level set.",
    };
  }

  if (!schemas.SetCalibrationLevelSetActiveRequest) {
    schemas.SetCalibrationLevelSetActiveRequest = {
      type: "object",
      properties: {
        isActive: { type: "boolean", description: "False retires the ladder so it accepts no new work." },
        rowVersion: byteRowVersion,
      },
      additionalProperties: false,
      description: "Request body for retiring or reinstating a calibration level set.",
    };
  }

  if (!schemas.CreateCalibrationLevelSetResponse) {
    schemas.CreateCalibrationLevelSetResponse = {
      type: "object",
      properties: { id: { type: "string", format: "uuid" } },
      additionalProperties: false,
      description: "Response returned when a calibration level set is created.",
    };
  }

  if (!schemas.PagedResultOfCalibrationLevelSetListItemDto) {
    schemas.PagedResultOfCalibrationLevelSetListItemDto = {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: { $ref: "#/components/schemas/CalibrationLevelSetListItemDto" },
          nullable: true,
        },
        totalCount: { type: "integer", format: "int32" },
        page: { type: "integer", format: "int32" },
        pageSize: { type: "integer", format: "int32" },
      },
      additionalProperties: false,
      description: "Paginated list envelope per API conventions.",
    };
  }
}

/**
 * Build the calibration-level-set paths and splice them into `doc.paths` in place,
 * right after the existing `/api/calibration-groups/*` block (where the flat
 * `/api/calibration-levels*` routes used to live). Keeping the grouped placement
 * avoids shifting every subsequent path and keeps the generated diff readable.
 */
function insertSetPaths(doc) {
  doc.paths ??= {};

  const problem = (description) => ({
    description,
    content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } },
  });
  const okJson = (ref) => ({
    description: "OK",
    content: { "application/json": { schema: { $ref: ref } } },
  });
  const createdJson = (ref) => ({
    description: "Created",
    content: { "application/json": { schema: { $ref: ref } } },
  });
  const noContent = { description: "No Content" };
  const idParam = { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } };
  const setIdParam = { name: "setId", in: "path", required: true, schema: { type: "string", format: "uuid" } };
  const jsonBody = (ref, description) => ({
    description,
    content: { "application/json": { schema: { $ref: ref } } },
  });

  const setTag = "Calibration level sets";
  const levelTag = "Calibration levels";

  const newPaths = [];

  if (!doc.paths["/api/calibration-level-sets"]) {
    newPaths.push([
      "/api/calibration-level-sets",
      {
        get: {
          tags: [setTag],
          summary: "Returns a page of calibration level sets for the caller's laboratory.",
          description: "Scoped to the caller's laboratory; soft-deleted sets are excluded.",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", format: "int32" } },
            { name: "pageSize", in: "query", schema: { type: "integer", format: "int32" } },
            { name: "sort", in: "query", schema: { type: "string" } },
          ],
          responses: {
            200: okJson("#/components/schemas/PagedResultOfCalibrationLevelSetListItemDto"),
            401: problem("Unauthorized"),
            403: problem("Forbidden"),
          },
        },
        post: {
          tags: [setTag],
          summary: "Creates a new calibration level set for the caller's laboratory.",
          requestBody: jsonBody("#/components/schemas/CreateCalibrationLevelSetRequest", "Set name and optional target department."),
          responses: {
            201: createdJson("#/components/schemas/CreateCalibrationLevelSetResponse"),
            400: problem("Bad Request"),
            401: problem("Unauthorized"),
            403: problem("Forbidden"),
          },
        },
      },
    ]);
  }

  if (!doc.paths["/api/calibration-level-sets/{id}"]) {
    newPaths.push([
      "/api/calibration-level-sets/{id}",
      {
        get: {
          tags: [setTag],
          summary: "Returns full calibration level set detail by id.",
          parameters: [idParam],
          responses: {
            200: okJson("#/components/schemas/CalibrationLevelSetDetailDto"),
            401: problem("Unauthorized"),
            403: problem("Forbidden"),
            404: problem("Not Found"),
          },
        },
        put: {
          tags: [setTag],
          summary: "Renames a calibration level set.",
          parameters: [idParam],
          requestBody: jsonBody("#/components/schemas/UpdateCalibrationLevelSetRequest", "Replacement name and concurrency token."),
          responses: {
            204: noContent,
            400: problem("Bad Request"),
            401: problem("Unauthorized"),
            403: problem("Forbidden"),
            404: problem("Not Found"),
            409: problem("Conflict"),
          },
        },
        delete: {
          tags: [setTag],
          summary: "Deletes a calibration level set that nothing references, along with its levels.",
          parameters: [idParam],
          responses: {
            204: noContent,
            400: problem("Bad Request"),
            401: problem("Unauthorized"),
            403: problem("Forbidden"),
            404: problem("Not Found"),
            409: problem("Conflict"),
          },
        },
      },
    ]);
  }

  if (!doc.paths["/api/calibration-level-sets/{id}/active"]) {
    newPaths.push([
      "/api/calibration-level-sets/{id}/active",
      {
        put: {
          tags: [setTag],
          summary: "Retires or reinstates a calibration level set.",
          parameters: [idParam],
          requestBody: jsonBody("#/components/schemas/SetCalibrationLevelSetActiveRequest", "Target active state and concurrency token."),
          responses: {
            204: noContent,
            400: problem("Bad Request"),
            401: problem("Unauthorized"),
            403: problem("Forbidden"),
            404: problem("Not Found"),
            409: problem("Conflict"),
          },
        },
      },
    ]);
  }

  if (!doc.paths["/api/calibration-level-sets/{setId}/levels"]) {
    newPaths.push([
      "/api/calibration-level-sets/{setId}/levels",
      {
        get: {
          tags: [levelTag],
          summary: "Returns a page of calibration levels in the given set.",
          parameters: [
            setIdParam,
            { name: "page", in: "query", schema: { type: "integer", format: "int32" } },
            { name: "pageSize", in: "query", schema: { type: "integer", format: "int32" } },
            { name: "sort", in: "query", schema: { type: "string" } },
          ],
          responses: {
            200: okJson("#/components/schemas/PagedResultOfCalibrationLevelListItemDto"),
            401: problem("Unauthorized"),
            403: problem("Forbidden"),
            404: problem("Not Found"),
          },
        },
        post: {
          tags: [levelTag],
          summary: "Adds a calibration level to the given set.",
          parameters: [setIdParam],
          requestBody: jsonBody("#/components/schemas/CreateCalibrationLevelRequest", "Level name, true concentration, and sort order."),
          responses: {
            201: createdJson("#/components/schemas/CreateCalibrationLevelResponse"),
            400: problem("Bad Request"),
            401: problem("Unauthorized"),
            403: problem("Forbidden"),
            404: problem("Not Found"),
          },
        },
      },
    ]);
  }

  if (!doc.paths["/api/calibration-level-sets/{setId}/levels/{id}"]) {
    newPaths.push([
      "/api/calibration-level-sets/{setId}/levels/{id}",
      {
        get: {
          tags: [levelTag],
          summary: "Returns full calibration level detail by id within its set.",
          parameters: [setIdParam, idParam],
          responses: {
            200: okJson("#/components/schemas/CalibrationLevelDetailDto"),
            401: problem("Unauthorized"),
            403: problem("Forbidden"),
            404: problem("Not Found"),
          },
        },
        put: {
          tags: [levelTag],
          summary: "Updates a calibration level.",
          parameters: [setIdParam, idParam],
          requestBody: jsonBody("#/components/schemas/UpdateCalibrationLevelRequest", "Replacement level fields and concurrency token."),
          responses: {
            204: noContent,
            400: problem("Bad Request"),
            401: problem("Unauthorized"),
            403: problem("Forbidden"),
            404: problem("Not Found"),
            409: problem("Conflict"),
          },
        },
        delete: {
          tags: [levelTag],
          summary: "Soft-deletes a calibration level.",
          parameters: [setIdParam, idParam],
          responses: {
            204: noContent,
            400: problem("Bad Request"),
            401: problem("Unauthorized"),
            403: problem("Forbidden"),
            404: problem("Not Found"),
            409: problem("Conflict"),
          },
        },
      },
    ]);
  }

  if (newPaths.length === 0) return; // Already present; nothing to insert.

  // Rebuild `paths`, inserting the new set paths after the last `/api/calibration-groups/*` key.
  const entries = Object.entries(doc.paths);
  let insertAt = -1;
  for (let i = 0; i < entries.length; i++) {
    if (entries[i][0].startsWith("/api/calibration-groups")) insertAt = i;
  }
  if (insertAt === -1) insertAt = entries.length - 1;

  const rebuilt = {};
  entries.forEach(([key, value], i) => {
    rebuilt[key] = value;
    if (i === insertAt) {
      for (const [nk, nv] of newPaths) rebuilt[nk] = nv;
    }
  });
  doc.paths = rebuilt;
}

function addTags(doc) {
  doc.tags ??= [];
  if (!doc.tags.some((t) => t.name === "Calibration level sets")) {
    doc.tags.push({
      name: "Calibration level sets",
      description: "HTTP API for department-scoped calibration level sets (named ladders of calibration standards).",
    });
  }
}

/**
 * feat/ic-slk-parser — second idempotent patch over the develop-shape export.
 *
 * Adds the new write/read fields introduced alongside calibration level sets:
 * `methodFamily` on method-config writes + detail/snapshot, `importFormat` and
 * `detectorSignal` on runs, the `GET /api/method-configs/family-defaults`
 * endpoint, and the two new `RunValidationIssueCode` members (11, 12).
 */
export function applyIcSlkParserPatch(doc) {
  const schemas = doc.components?.schemas ?? {};
  if (!schemas) return;

  const methodFamilyProp = () => ({
    type: "string",
    enum: ["VOC", "GRO", "BTEX", "DRO", "ORO", "Anions"],
    nullable: true,
    description: "Optional method family tag; null/absent means untagged.",
  });
  const importFormatProp = () => ({
    type: "string",
    enum: ["MassHunterText", "ChemStationCsv", "PidText", "IcSlk", "IcCsv", "Generic"],
    nullable: true,
    description: "Parser selector; null means conservative auto-detect only.",
  });

  const addProp = (schema, key, prop) => {
    if (schema?.properties && !schema.properties[key]) schema.properties[key] = prop;
  };

  // Method config: methodFamily on create/update requests and detail/snapshot reads.
  for (const key of ["CreateMethodConfigRequest", "UpdateMethodConfigRequest"]) {
    addProp(schemas[key], "methodFamily", methodFamilyProp());
  }
  addProp(schemas.MethodConfigDetailDto, "methodFamily", methodFamilyProp());
  addProp(schemas.MethodConfigSnapshotDto, "methodFamily", methodFamilyProp());

  // Backend now returns the set binding on method-config read models.
  addProp(schemas.MethodConfigDetailDto, "calibrationLevelSetId", {
    type: "string",
    format: "uuid",
    description: "Calibration level set this configuration evaluates against. Non-nullable: every config has one.",
  });
  addProp(schemas.MethodConfigSnapshotDto, "calibrationLevelSetId", {
    type: "string",
    format: "uuid",
    nullable: true,
    description: "Frozen calibration level set id (schema v6+); null for historical pre-set rows.",
  });

  // Runs: importFormat on the paste create request; importFormat + detectorSignal on detail.
  addProp(schemas.CreateRunRequest, "importFormat", importFormatProp());
  addProp(schemas.RunDetailResponse, "importFormat", importFormatProp());
  addProp(schemas.RunDetailResponse, "detectorSignal", {
    type: "string",
    nullable: true,
    description: "ChemStation Signal: file metadata (not a Front/Back picker); null on MassHunter/PID.",
  });

  // Runs: set/level binding now surfaced on reads.
  addProp(schemas.RunDetailResponse, "calibrationLevelId", {
    type: "string",
    format: "uuid",
    nullable: true,
    description: "Resolved calibration level for CAL runs, if any.",
  });
  addProp(schemas.RunDetailResponse, "calibrationLevelSetId", {
    type: "string",
    format: "uuid",
    nullable: true,
    description: "Calibration level set that owns the run's level; null for ICV / unbound.",
  });
  addProp(schemas.CalibrationRunListItemResponse, "calibrationLevelSetId", {
    type: "string",
    format: "uuid",
    nullable: true,
    description: "Calibration level set that owns the run's level; null for ICV / unbound.",
  });

  // Denormalized names so clients never render raw UUIDs (backend reply #1/#2/#3).
  const nullableName = (description) => ({
    type: "string",
    nullable: true,
    description,
  });
  for (const key of ["RunDetailResponse", "CalibrationRunListItemResponse"]) {
    addProp(schemas[key], "calibrationLevelName", nullableName("Resolved calibration level label (e.g. \"Cal_10ppb\"); null for ICV / unbound."));
    addProp(schemas[key], "calibrationLevelSetName", nullableName("Name of the owning calibration level set; null for ICV / unbound."));
  }

  // Group candidates: same denormalized level/set names (backend reply #1 parity).
  addProp(schemas.GroupCandidateRunResponse, "calibrationLevelSetId", {
    type: "string",
    format: "uuid",
    nullable: true,
    description: "Calibration level set a CAL run was bound to; null for ICV or unbound runs.",
  });
  addProp(schemas.GroupCandidateRunResponse, "calibrationLevelName", nullableName(
    "Display name of the resolved calibration level; null when the run has no level.",
  ));
  addProp(schemas.GroupCandidateRunResponse, "calibrationLevelSetName", nullableName(
    "Display name of the bound calibration level set; null for ICV or unbound runs.",
  ));

  addProp(schemas.CalibrationGroupDetailResponse, "instrumentName", {
    type: "string",
    nullable: true,
    description: "Instrument display name; falls back to \"\" only if the row is unresolvable.",
  });
  addProp(schemas.CalibrationGroupDetailResponse, "methodConfigName", {
    type: "string",
    nullable: true,
    description: "Method config display name; falls back to \"\" only if the row is unresolvable.",
  });
  addProp(schemas.CalibrationGroupListItemResponse, "instrumentName", {
    type: "string",
    nullable: true,
    description: "Instrument display name; falls back to \"\" only if the row is unresolvable.",
  });
  addProp(schemas.CalibrationGroupListItemResponse, "methodConfigName", {
    type: "string",
    nullable: true,
    description: "Method config display name; falls back to \"\" only if the row is unresolvable.",
  });

  addProp(schemas.MethodConfigSnapshotDto, "calibrationLevelSetName", nullableName(
    "Name of the frozen calibration level set; null exactly when calibrationLevelSetId is null.",
  ));

  // Validation codes 11 (CalibrationLevelSetMismatch) and 12 (ImportFormatMismatch).
  const issueCode = schemas.RunValidationIssueCode;
  if (Array.isArray(issueCode?.enum)) {
    for (const v of ["CalibrationLevelSetMismatch", "ImportFormatMismatch"]) {
      if (!issueCode.enum.includes(v)) issueCode.enum.push(v);
    }
  }

  // Family defaults: server-owned family → quantitation-mode map.
  if (!schemas.MethodFamilyDefaultsResponse) {
    schemas.MethodFamilyDefaultsResponse = {
      type: "object",
      properties: {
        methodFamily: methodFamilyProp(),
        quantitationMode: {
          type: "string",
          enum: ["InternalStandard", "ExternalStandard"],
          nullable: true,
          description: "Server-chosen quantitation mode for the family.",
        },
      },
      additionalProperties: false,
      description: "One row of GET /api/method-configs/family-defaults.",
    };
  }

  insertFamilyDefaultsPath(doc);
}

function insertFamilyDefaultsPath(doc) {
  doc.paths ??= {};
  const p = "/api/method-configs/family-defaults";
  if (doc.paths[p]) return;
  doc.paths[p] = {
    get: {
      tags: ["Method configuration"],
      summary: "Returns the server-owned method-family → quantitation-mode defaults.",
      description:
        "A single server-owned map so clients do not hardcode VOC→ISTD, DRO→ESTD, etc. Used to pre-fill the method config form when a family is selected.",
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/MethodFamilyDefaultsResponse" },
              },
            },
          },
        },
        401: {
          description: "Unauthorized",
          content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } },
        },
        403: {
          description: "Forbidden",
          content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } },
        },
      },
    },
  };
}

/**
 * Empty calibration group drafts — third idempotent patch.
 *
 * `calRunIds` may now be empty on create/update (an "empty draft"); a new
 * `DELETE /api/calibration-groups/{id}` soft-deletes a Draft group; and the
 * group list item gains `calRunCount` so the UI can tell an empty draft apart
 * from a populated group.
 */
export function applyEmptyDraftPatch(doc) {
  const schemas = doc.components?.schemas ?? {};
  const addProp = (schema, key, prop) => {
    if (schema?.properties && !schema.properties[key]) schema.properties[key] = prop;
  };

  // calRunCount on the group list item.
  addProp(schemas.CalibrationGroupListItemResponse, "calRunCount", {
    type: "integer",
    format: "int32",
    description: "Number of CAL runs in the group; 0 for an empty draft.",
  });

  // calRunIds may now be empty on create/update.
  for (const key of ["CreateCalibrationGroupRequest", "UpdateCalibrationGroupRequest"]) {
    const req = schemas[key];
    if (req?.properties?.calRunIds) {
      req.properties.calRunIds.description =
        "CAL run ids; may be empty to create/keep an empty draft. Each id must be unique, target a CAL run on the group's instrument, and have pairwise-distinct calibration levels.";
    }
  }

  insertGroupDeletePath(doc);
}

function insertGroupDeletePath(doc) {
  doc.paths ??= {};
  const p = doc.paths["/api/calibration-groups/{id}"];
  if (!p || p.delete) return;

  p.delete = {
    tags: ["Calibration groups"],
    summary: "Soft-deletes a Draft calibration group and releases its runs.",
    description:
      "Deletes an abandoned draft group: clears its CAL run membership, drops the optional ICV reference, and hard-deletes its excluded-analytes list — in one transaction. Released runs return to ungrouped only if no other group references them; runs are never deleted. Draft-only: Computed/Approved/Rejected return 409. Recorded in the audit trail as CalibrationGroupDeleted.",
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
    ],
    responses: {
      204: { description: "No Content" },
      401: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } } },
      403: { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } } },
      404: { description: "Not Found", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } } },
      409: { description: "Conflict", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } } },
    },
  };
}
