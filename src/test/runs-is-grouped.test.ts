import { afterEach, describe, expect, it, vi } from "vitest";
import { listRuns } from "@/lib/api/wltr-api";
import { readIsGrouped } from "@/lib/types/wltr";

/** Records every URL the client requests; returns an empty paged body so `listRuns` resolves. */
function stubFetch(): string[] {
  const urls: string[] = [];
  vi.stubGlobal("fetch", (input: unknown) => {
    urls.push(String(input));
    return Promise.resolve(
      new Response(JSON.stringify({ items: [], totalCount: 0, page: 1, pageSize: 25 }), {
        headers: { "content-type": "application/json" },
      }),
    );
  });
  return urls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listRuns isGrouped", () => {
  it("omits the parameter when the filter is not set", async () => {
    const urls = stubFetch();
    await listRuns({ page: 1, pageSize: 25 });
    expect(urls[0]).not.toContain("isGrouped");
  });

  it("sends false so the caller gets the pool for a new group", async () => {
    const urls = stubFetch();
    await listRuns({ isGrouped: false });
    expect(urls[0]).toContain("isGrouped=false");
  });

  it("combines with the other run filters", async () => {
    const urls = stubFetch();
    await listRuns({ instrumentId: "i-1", runType: "CAL", status: "Valid", isGrouped: true });
    const url = urls[0];
    expect(url).toContain("instrumentId=i-1");
    expect(url).toContain("runType=CAL");
    expect(url).toContain("status=Valid");
    expect(url).toContain("isGrouped=true");
  });
});

describe("readIsGrouped", () => {
  it("passes booleans through", () => {
    expect(readIsGrouped(true)).toBe(true);
    expect(readIsGrouped(false)).toBe(false);
  });

  it("is null for an API build that does not send the field", () => {
    expect(readIsGrouped(undefined)).toBeNull();
    expect(readIsGrouped("true")).toBeNull();
  });
});
