import spec from "../../../openapi/wltr.openapi.json";

export type OpenApiOperation = {
  id: string;
  method: string;
  path: string;
  tag: string;
  summary: string;
  description: string;
};

type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

const METHODS: HttpMethod[] = ["get", "post", "put", "delete", "patch"];

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function operationId(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

/** All operations from the bundled OpenAPI document, sorted for browsing. */
export function listOpenApiOperations(): OpenApiOperation[] {
  const paths = spec.paths as Record<string, Partial<Record<HttpMethod, Record<string, unknown>>>>;
  const ops: OpenApiOperation[] = [];

  for (const [path, item] of Object.entries(paths)) {
    for (const method of METHODS) {
      const op = item?.[method];
      if (!op) continue;
      const tags = Array.isArray(op.tags) ? (op.tags as string[]) : [];
      ops.push({
        id: operationId(method, path),
        method: method.toUpperCase(),
        path,
        tag: tags[0] ?? "Other",
        summary: typeof op.summary === "string" ? stripHtml(op.summary) : operationId(method, path),
        description: typeof op.description === "string" ? stripHtml(op.description) : "",
      });
    }
  }

  return ops.sort((a, b) => {
    const tag = a.tag.localeCompare(b.tag);
    if (tag !== 0) return tag;
    return a.path.localeCompare(b.path) || a.method.localeCompare(b.method);
  });
}

export function getOpenApiInfo(): { title: string; version: string; description: string } {
  const info = spec.info as { title?: string; version?: string; description?: string };
  return {
    title: info.title ?? "WLTR API",
    version: info.version ?? "v1",
    description: info.description ?? "",
  };
}

export function getOpenApiTags(): { name: string; description: string }[] {
  const tags = spec.tags as { name?: string; description?: string }[] | undefined;
  if (!Array.isArray(tags)) return [];
  return tags.map((t) => ({
    name: t.name ?? "",
    description: typeof t.description === "string" ? stripHtml(t.description) : "",
  }));
}

/** Permission rows from the API intro markdown table (authoritative for role admin UI). */
export const API_PERMISSION_ROWS: { permission: string; label: string; heldBy: string }[] = [
  { permission: "perm.view", label: "View", heldBy: "All lab roles" },
  { permission: "perm.users.manage_lab", label: "Lab user management", heldBy: "LabAdmin, SuperAdmin" },
  { permission: "perm.roles.manage_lab", label: "Lab role management", heldBy: "LabAdmin, SuperAdmin" },
  { permission: "perm.config.edit", label: "Lab configuration edit", heldBy: "LabAdmin, SuperAdmin" },
  { permission: "perm.runs.upload", label: "Run upload", heldBy: "Analyst, LabAdmin, SuperAdmin" },
  { permission: "perm.runs.delete", label: "Run delete", heldBy: "Analyst, LabAdmin, SuperAdmin" },
  { permission: "perm.groups.approve", label: "Groups approve", heldBy: "QA, LabAdmin, SuperAdmin" },
  { permission: "perm.laboratories.manage", label: "Lab settings manage", heldBy: "LabAdmin, SuperAdmin" },
  { permission: "perm.laboratories.create", label: "Laboratory create (platform)", heldBy: "SuperAdmin only" },
  { permission: "perm.platform.manage", label: "Platform manage", heldBy: "SuperAdmin only" },
];
