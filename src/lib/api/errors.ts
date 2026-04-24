export type ProblemDetails = {
  type?: string | null;
  title?: string | null;
  status?: number | null;
  detail?: string | null;
  instance?: string | null;
};

export class ApiError extends Error {
  readonly status: number;
  readonly problem?: ProblemDetails;

  constructor(message: string, status: number, problem?: ProblemDetails) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }
}

export async function parseErrorResponse(res: Response): Promise<ApiError> {
  const status = res.status;
  const ct = res.headers.get("content-type") || "";
  let text = "";
  try {
    text = await res.text();
  } catch {
    text = "";
  }
  if (ct.includes("json") && text) {
    try {
      const j = JSON.parse(text) as ProblemDetails & Record<string, unknown>;
      const detail = typeof j.detail === "string" ? j.detail : text;
      const title = typeof j.title === "string" ? j.title : `HTTP ${status}`;
      return new ApiError(detail || title, status, j);
    } catch {
      return new ApiError(text || `HTTP ${status}`, status);
    }
  }
  return new ApiError(text || `HTTP ${status}`, status);
}
