import { afterEach, describe, expect, it, vi } from "vitest";
import { startShell } from "./shell.js";

const page = () => {
  const registered: unknown[][] = [];
  vi.stubGlobal("navigator", {
    serviceWorker: {
      register: async (...given: unknown[]) => {
        registered.push(given);
      },
    },
  });
  return { registered };
};

describe("starting the shell", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers the service worker as a module", async () => {
    const shown = page();
    await startShell();

    expect(shown.registered).toEqual([["/sw.js", { type: "module" }]]);
  });
});
