import { describe, expect, it } from "vitest";
import { ApiError, parseErrorResponse } from "@/lib/api/errors";

describe("parseErrorResponse", () => {
  it("parses problem+json detail", async () => {
    const res = new Response(JSON.stringify({ title: "Bad Request", status: 400, detail: "Nope" }), {
      status: 400,
      headers: { "content-type": "application/problem+json" },
    });
    const err = await parseErrorResponse(res);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe("Nope");
    expect(err.status).toBe(400);
  });
});
