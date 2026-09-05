import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ENTRY = resolve("tools/no-cache-storage-reach/src/index.ts");
const PLANTED = "tools/no-cache-storage-reach/planted";

const REFUSED = [
  "braced-unicode.ts.txt",
  "hex.ts.txt",
  "identity-escape.ts.txt",
  "line-continuation.ts.txt",
  "plain-unicode.ts.txt",
  "plain.ts.txt",
];

let repository: string;

const env = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")),
);

const gate = (...args: readonly string[]) =>
  spawnSync(process.execPath, [ENTRY, ...args], {
    cwd: repository,
    encoding: "utf8",
    env,
  });

beforeAll(() => {
  repository = mkdtempSync(join(tmpdir(), "planted-"));
  cpSync(PLANTED, join(repository, PLANTED), { recursive: true });
  for (const args of [
    ["init", "--quiet"],
    ["add", "--all"],
  ])
    execFileSync("git", args, { cwd: repository, env });
});

afterAll(() => {
  rmSync(repository, { recursive: true, force: true });
});

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
