import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGIN = "https://seatscout.test";

const SEAT_MAP = `${ORIGIN}/napi/seatMap/561478479`;

const SHELL = [
  "/",
  "/index.js",
  "/manifest.webmanifest",
  "/house.css",
  "/app.css",
  "/query.css",
  "/results.css",
  "/coverage.css",
  "/icon.svg",
  "/fonts/big-shoulders-display.woff2",
  "/fonts/schibsted-grotesk.woff2",
  "/fonts/spline-sans-mono.woff2",
];

const worker = async () => {
  const listeners = new Map<string, (event: unknown) => void>();
  const held = new Map<string, Response>();
  const waited: Promise<unknown>[] = [];

  vi.stubGlobal("self", {
    location: { origin: ORIGIN },
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
    install: async () => {
      listeners.get("install")?.({
        waitUntil: (work: Promise<unknown>) => waited.push(work),
      });
      await Promise.all(waited);
    },
    request: async (url: string, method = "GET") => {
      const answered: Promise<Response>[] = [];
      listeners.get("fetch")?.({
        request: { url, method },
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

    expect([...sw.held.keys()]).toEqual(SHELL);
  });

  it("answers a shell request from the network while there is one", async () => {
    vi.stubGlobal(
      "fetch",
      async (request: { url: string }) => new Response(`live ${request.url}`),
    );
    const sw = await worker();
    await sw.install();

    expect(await (await sw.request(`${ORIGIN}/`))[0]?.text()).toBe(
      `live ${ORIGIN}/`,
    );
  });

  it("answers a shell request from the cache once the network is gone", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    const sw = await worker();
    await sw.install();

    expect(await (await sw.request(`${ORIGIN}/index.js`))[0]?.text()).toBe(
      "cached /index.js",
    );
  });

  it("answers with a network error where the shell was never cached", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    const sw = await worker();

    expect((await sw.request(`${ORIGIN}/`))[0]?.type).toBe("error");
  });

  it("leaves a seat map to the network and the cache untouched", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    const sw = await worker();
    await sw.install();

    expect(await sw.request(SEAT_MAP)).toEqual([]);
    expect([...sw.held.keys()]).toEqual(SHELL);
  });

  it("leaves another origin's file of the same name to the network", async () => {
    const sw = await worker();
    await sw.install();

    expect(await sw.request("https://elsewhere.test/index.js")).toEqual([]);
  });

  it("leaves a request that is not a read to the network", async () => {
    const sw = await worker();
    await sw.install();

    expect(await sw.request(`${ORIGIN}/`, "POST")).toEqual([]);
  });
});
