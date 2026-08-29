import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const ENTRY = "tools/no-cache-storage-reach/src/index.ts";
const PLANTED = "tools/no-cache-storage-reach/planted";

const REFUSED = [
  "braced-unicode.ts.txt",
  "hex.ts.txt",
  "identity-escape.ts.txt",
  "line-continuation.ts.txt",
  "plain-unicode.ts.txt",
  "plain.ts.txt",
];

const gate = (...args: readonly string[]) =>
  spawnSync(process.execPath, [ENTRY, ...args], { encoding: "utf8" });

describe("the planted red", () => {
  it("refuses every spelling planted under it, and only those", () => {
    const run = gate(PLANTED);

    expect(run.status).toBe(1);
    expect(run.stderr).toBe(
      `Refusing ${REFUSED.length} file(s) that name Cache Storage:\n` +
        REFUSED.map((file) => `  ${PLANTED}/${file}`).join("\n") +
        "\n\nCache Storage is reached only through apps/web/src/worker/cache.ts, whose writer takes no\n" +
        "argument and caches the build's own output. Availability changes minute to minute,\n" +
        "so a cached seat is a lie with a plausible face. CONTRIBUTING.md says why.\n",
    );
  });

  it("accepts the planted file that reaches nothing, so it is not refusing everything", () => {
    const run = gate(`${PLANTED}/clean.ts.txt`);

    expect(run.status).toBe(0);
    expect(run.stderr).toBe("");
  });

  it("refuses a pathspec that matches no tracked file", () => {
    expect(gate("no/such/directory").status).toBe(1);
  });
});
