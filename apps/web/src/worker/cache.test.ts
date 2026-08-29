import { afterEach, describe, expect, it, vi } from "vitest";
import { cachedShell, isShellPath, precacheShell } from "./cache.js";

const SEAT_MAP = "/napi/seatMap/561478479";

const cacheStorage = () => {
  const opened: string[] = [];
  const held = new Map<string, Response>();
  vi.stubGlobal("caches", {
    open: async (name: string) => {
      opened.push(name);
      return {
        addAll: async (paths: readonly string[]) => {
          for (const path of paths) held.set(path, new Response(path));
        },
      };
    },
    match: async (path: string) => held.get(path),
  });
  return { opened, held };
};

describe("the shell cache", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("holds the page, its module and its manifest and nothing else", async () => {
    const storage = cacheStorage();
    await precacheShell();

    expect(storage.opened).toEqual(["shell"]);
    expect([...storage.held.keys()]).toEqual([
      "/",
      "/index.js",
      "/manifest.webmanifest",
    ]);
  });

  it("answers a path the shell cache holds with what was put there", async () => {
    cacheStorage();
    await precacheShell();

    expect(await (await cachedShell("/index.js"))?.text()).toBe("/index.js");
  });

  it("answers a path the shell cache does not hold with nothing", async () => {
    cacheStorage();
    await precacheShell();

    expect(await cachedShell(SEAT_MAP)).toBeUndefined();
  });

  it("counts the page, its module and its manifest as the shell, and a seat map not", () => {
    expect(
      ["/", "/index.js", "/manifest.webmanifest"].map(isShellPath),
    ).toEqual([true, true, true]);
    expect(isShellPath(SEAT_MAP)).toBe(false);
  });
});
