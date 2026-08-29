import { describe, expect, it } from "vitest";
import { measureWith } from "./measure.js";
import type { Completed, Shell } from "./shell.js";

interface Command {
  readonly command: string;
  readonly args: readonly string[];
}

const recorder = (
  over: (command: Command) => Completed | undefined = () => undefined,
) => {
  const commands: Command[] = [];

  const canned = (command: Command): string => {
    if (command.command === "git" && command.args[0] === "rev-parse")
      return "head-sha\n";
    if (command.command === "git" && command.args[0] === "merge-base")
      return "base-sha\n";
    if (command.command === "cloc" && command.args[1] === "--diff")
      return JSON.stringify({
        added: { "packages/core/src/seat.ts": { code: 5, comment: 0 } },
        removed: {},
        modified: {},
      });
    if (command.command === "cloc")
      return JSON.stringify({
        header: { cloc_version: "2.10" },
        "packages/core/src/seat.ts": { code: 40, comment: 1 },
        SUM: { code: 40, comment: 1 },
      });
    if (command.command === "pnpm")
      return JSON.stringify([
        { name: "web app", size: 15, sizeLimit: 15, passed: true },
      ]);
    return "";
  };

  const shell: Shell = {
    run: (command, args) => {
      const call = { command, args: [...args] };
      commands.push(call);
      return over(call) ?? { ok: true, stdout: canned(call), stderr: "" };
    },
  };

  return { shell, commands };
};

const lines = (commands: readonly Command[]): readonly string[] =>
  commands.map(({ command, args }) => [command, ...args].join(" "));

describe("measuring a change", () => {
  it("resolves the head first, then the merge base against it", () => {
    const { shell, commands } = recorder();

    measureWith(shell)("origin/main", "HEAD");

    expect(lines(commands).slice(0, 2)).toStrictEqual([
      "git rev-parse HEAD",
      "git merge-base origin/main head-sha",
    ]);
  });

  it("counts each side and the diff between them", () => {
    const { shell, commands } = recorder();

    measureWith(shell)("origin/main", "HEAD");

    expect(lines(commands)).toContain(
      "cloc --git base-sha --by-file --json --hide-rate --quiet",
    );
    expect(lines(commands)).toContain(
      "cloc --git head-sha --by-file --json --hide-rate --quiet",
    );
    expect(lines(commands)).toContain(
      "cloc --git --diff base-sha head-sha --by-file --json --hide-rate --quiet",
    );
  });

  it("asks size-limit for its verdict as machine readable output", () => {
    const { shell, commands } = recorder();

    measureWith(shell)("origin/main", "HEAD");

    expect(lines(commands)).toContain("pnpm exec size-limit --json");
  });

  it("carries the counter's numbers into the measurement", () => {
    const { shell } = recorder();

    const measurement = measureWith(shell)("origin/main", "HEAD");

    expect(measurement.base.ref).toBe("base-sha");
    expect(measurement.head.ref).toBe("head-sha");
    expect(measurement.head.tree).toStrictEqual({
      "packages/core/src/seat.ts": { code: 40, comment: 1 },
    });
    expect(measurement.diff.added).toStrictEqual({
      "packages/core/src/seat.ts": { code: 5, comment: 0 },
    });
    expect(measurement.bundles).toStrictEqual([
      { name: "web app", size: 15, sizeLimit: 15, passed: true },
    ]);
  });

  it("names the command and repeats its complaint when one fails", () => {
    const { shell } = recorder((command) =>
      command.command === "git" && command.args[0] === "rev-parse"
        ? { ok: false, stdout: "", stderr: "unknown revision" }
        : undefined,
    );

    expect(() => measureWith(shell)("origin/main", "HEAD")).toThrow(
      "git rev-parse HEAD\nunknown revision",
    );
  });

  it("reads the bundle verdict from size-limit even when it exits non-zero", () => {
    const { shell } = recorder((command) =>
      command.command === "pnpm"
        ? {
            ok: false,
            stdout: JSON.stringify([
              { name: "web app", size: 90, sizeLimit: 15, passed: false },
            ]),
            stderr: "",
          }
        : undefined,
    );

    expect(measureWith(shell)("origin/main", "HEAD").bundles).toStrictEqual([
      { name: "web app", size: 90, sizeLimit: 15, passed: false },
    ]);
  });
});
