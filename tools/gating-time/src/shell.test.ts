import { describe, expect, it } from "vitest";
import { read } from "./shell.ts";

const node = process.execPath;

const refusalOf = (command: string, args: readonly string[]): string => {
  try {
    read(command, args);
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "a refusal that is not an Error";
  }
  return "no refusal";
};

describe("reading what a command prints", () => {
  it("hands back the whole of what it printed", () => {
    const wide = 2_000_000;

    expect(
      read(node, ["-e", `process.stdout.write("x".repeat(${wide}))`]),
    ).toHaveLength(wide);
  });

  it("refuses a command that failed, naming it and quoting what it said", () => {
    expect(
      refusalOf(node, [
        "-e",
        "process.stdout.write('half a page'); process.stderr.write('gh: Not Found (HTTP 404)\\n'); process.exit(1)",
      ]),
    ).toBe(
      `${node} -e process.stdout.write('half a page'); process.stderr.write('gh: Not Found (HTTP 404)\\n'); process.exit(1)\ngh: Not Found (HTTP 404)`,
    );
  });

  it("refuses a command it could not start, naming it and the reason", () => {
    expect(refusalOf("no-such-command-here", ["api"])).toBe(
      "no-such-command-here api\nspawnSync no-such-command-here ENOENT",
    );
  });
});
