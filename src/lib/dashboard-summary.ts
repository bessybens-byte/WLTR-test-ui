import { ApiError } from "@/lib/api/errors";
import type { DashboardActionItem, DashboardActionItemKind } from "@/lib/types/wltr";

export function resolveActionItemKind(item: DashboardActionItem): DashboardActionItemKind | null {
  const raw = (item.kind ?? item.type ?? "").trim();
  if (raw === "Recompute") return "Recompute";
  if (raw === "Review") return "Review";

  const lower = raw.toLowerCase();
  if (lower === "recompute") return "Recompute";
  if (lower === "review") return "Review";

  const title = (item.title ?? "").toLowerCase();
  if (title.includes("recompute")) return "Recompute";
  if (title.includes("review")) return "Review";
  return null;
}

export function actionItemLabel(item: DashboardActionItem): string {
  if (item.title?.trim()) return item.title.trim();
  const name = item.name?.trim() || "group";
  const kind = resolveActionItemKind(item);
  if (kind === "Recompute") return `Recompute Group ${name}`;
  if (kind === "Review") return `Review Group ${name}`;
  return name;
}

export function actionItemHref(item: DashboardActionItem): string {
  const id = item.calibrationGroupId;
  const kind = resolveActionItemKind(item);
  if (kind === "Recompute") return `/calibration-groups/${id}?tab=compute`;
  if (kind === "Review") return `/calibration-groups/${id}?tab=review`;
  return `/calibration-groups/${id}`;
}

export function actionItemKey(item: DashboardActionItem): string {
  const kind = resolveActionItemKind(item) ?? item.kind ?? item.type ?? "action";
  return `${item.calibrationGroupId}-${kind}`;
}

export function priorityTone(priority: string): "ok" | "warn" | "bad" | "neutral" {
  const p = priority.toLowerCase();
  if (p === "high") return "bad";
  if (p === "medium") return "warn";
  return "neutral";
}

export function dashboardErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return "You don't have access to this laboratory's dashboard data.";
    if (err.status === 404) return "Dashboard summary is not available for this scope.";
    return err.message;
  }
  return "Failed to load dashboard summary.";
}
