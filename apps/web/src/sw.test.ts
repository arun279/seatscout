import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const AVAILABILITY = "https://seatscout.test/napi/seatMap/561478479";

const worker = async () => {
  const listeners = new Map<string, (event: unknown) => void>();
  const held = new Map<string, Response>();
  const waited: Promise<unknown>[] = [];
  const answered: Promise<Response>[] = [];

  vi.stubGlobal("self", {
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      listeners.set(type, listener);
    },
  });
  vi.stubGlobal("caches", {
    open: async () => ({
      addAll: async (paths: readonly string[]) => {
        for (const path of paths)
          held.set(path, new Response(`cached ${path}`));
      },
    }),
    match: async (path: string) => held.get(path),
  });
  await import("./sw.js");

  return {
    held,
    answered,
    install: async () => {
      listeners.get("install")?.({
        waitUntil: (work: Promise<unknown>) => waited.push(work),
      });
      await Promise.all(waited);
    },
    request: async (url: string) => {
      listeners.get("fetch")?.({
        request: { url },
        respondWith: (answer: Promise<Response>) => answered.push(answer),
      });
      return Promise.all(answered);
    },
  };
};

describe("the service worker", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("puts the shell in the cache while it installs", async () => {
    const sw = await worker();
    await sw.install();

    expect([...sw.held.keys()]).toEqual([
      "/",
      "/index.js",
      "/manifest.webmanifest",
    ]);
  });

  it("answers a shell request from the network while there is one", async () => {
    vi.stubGlobal(
      "fetch",
      async (path: string) => new Response(`live ${path}`),
    );
    const sw = await worker();
    await sw.install();

    expect(await (await sw.request("https://seatscout.test/"))[0]?.text()).toBe(
      "live /",
    );
  });

  it("answers a shell request from the cache once the network is gone", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    const sw = await worker();
    await sw.install();

    expect(
      await (await sw.request("https://seatscout.test/index.js"))[0]?.text(),
    ).toBe("cached /index.js");
  });

  it("answers with a network error where the shell was never cached", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    const sw = await worker();

    expect((await sw.request("https://seatscout.test/"))[0]?.type).toBe(
      "error",
    );
  });

  it("leaves a seat map to the network and the cache untouched", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    const sw = await worker();
    await sw.install();

    expect(await sw.request(AVAILABILITY)).toEqual([]);
    expect([...sw.held.keys()]).toEqual([
      "/",
      "/index.js",
      "/manifest.webmanifest",
    ]);
  });
});
