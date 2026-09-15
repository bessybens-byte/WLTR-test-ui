import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import {
  actionItemHref,
  actionItemKey,
  actionItemLabel,
  dashboardErrorMessage,
  resolveActionItemKind,
} from "@/lib/dashboard-summary";
import type { DashboardActionItem } from "@/lib/types/wltr";

const baseItem: DashboardActionItem = {
  calibrationGroupId: "00000000-0000-0000-0000-000000000001",
  name: "MS4 March",
};

describe("resolveActionItemKind", () => {
  it("reads explicit kind values", () => {
    expect(resolveActionItemKind({ ...baseItem, kind: "Recompute" })).toBe("Recompute");
    expect(resolveActionItemKind({ ...baseItem, kind: "Review" })).toBe("Review");
  });

  it("falls back to title text", () => {
    expect(resolveActionItemKind({ ...baseItem, title: "Review Group MS4 March" })).toBe("Review");
  });
});

describe("action item presentation", () => {
  it("builds labels, links, and stable keys", () => {
    const recompute = { ...baseItem, kind: "Recompute" as const };
    const review = { ...baseItem, kind: "Review" as const };

    expect(actionItemLabel(recompute)).toBe("Recompute Group MS4 March");
    expect(actionItemHref(recompute)).toBe(
      "/calibration-groups/00000000-0000-0000-0000-000000000001?tab=compute",
    );
    expect(actionItemKey(recompute)).not.toBe(actionItemKey(review));
  });
});

describe("dashboardErrorMessage", () => {
  it("maps common API statuses", () => {
    expect(dashboardErrorMessage(new ApiError("Forbidden", 403))).toContain("don't have access");
    expect(dashboardErrorMessage(new ApiError("Missing", 404))).toContain("not available");
  });
});
