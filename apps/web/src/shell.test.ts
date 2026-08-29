import { afterEach, describe, expect, it, vi } from "vitest";
import { startShell } from "./shell.js";

const page = (options: { session?: string; line?: string } = {}) => {
  const held = new Map<string, string>();
  if (options.session !== undefined) held.set("session", options.session);
  const line = { replaceChildren: vi.fn() };
  const registered: unknown[][] = [];

  vi.stubGlobal("localStorage", {
    getItem: (key: string) => held.get(key) ?? null,
    setItem: (key: string, value: string) => {
      held.set(key, value);
    },
  });
  vi.stubGlobal("document", {
    querySelector: (asked: string) =>
      asked === (options.line ?? "#session") ? line : null,
  });
  vi.stubGlobal("navigator", {
    serviceWorker: {
      register: async (...given: unknown[]) => {
        registered.push(given);
      },
    },
  });
  return { line, registered };
};

describe("starting the shell", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("says no upstream session is held where the device holds none", async () => {
    const shown = page();
    await startShell();

    expect(shown.line.replaceChildren).toHaveBeenCalledWith(
      "No upstream session is held on this device.",
    );
  });

  it("says an upstream session is held where the device holds one", async () => {
    const shown = page({ session: "AKA_SESSION=held" });
    await startShell();

    expect(shown.line.replaceChildren).toHaveBeenCalledWith(
      "An upstream session is held on this device.",
    );
  });

  it("registers the service worker as a module", async () => {
    const shown = page();
    await startShell();

    expect(shown.registered).toEqual([["/sw.js", { type: "module" }]]);
  });

  it("registers the service worker even where the page has no line to write", async () => {
    const shown = page({ line: "#elsewhere" });
    await startShell();

    expect(shown.line.replaceChildren).not.toHaveBeenCalled();
    expect(shown.registered).toEqual([["/sw.js", { type: "module" }]]);
  });
});
