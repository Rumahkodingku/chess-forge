import { afterEach, describe, expect, it, vi } from "vitest";
import { cachedFetch, clearHttpCache, fetchWithTimeout } from "@/lib/http";

describe("cachedFetch", () => {
  afterEach(() => {
    clearHttpCache();
    vi.unstubAllGlobals();
  });

  it("returns a cached response for the same request", async () => {
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const first = await cachedFetch("https://example.test/data");
    const second = await cachedFetch("https://example.test/data");

    expect(await first.text()).toBe("ok");
    expect(await second.text()).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps an aborted request to timeout guidance", async () => {
    vi.stubGlobal(
      "fetch",
      (_input: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    await expect(
      fetchWithTimeout("https://example.test/slow", {}, 5),
    ).rejects.toThrow(/took too long/i);
  });
});
