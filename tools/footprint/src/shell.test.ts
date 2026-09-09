import { describe, expect, it } from "vitest";
import { run } from "./shell.js";

const node = process.execPath;

describe("running a command", () => {
  it("hands back what the command printed", () => {
    const completed = run(node, ["-e", "process.stdout.write('forty two')"]);

    expect(completed).toStrictEqual({
      ok: true,
      stdout: "forty two",
      stderr: "",
    });
  });

  it("carries the reason a command failed rather than its output", () => {
    const completed = run(node, [
      "-e",
      "process.stderr.write('no such revision'); process.exit(2)",
    ]);

    expect(completed.ok).toBe(false);
    expect(completed.stderr).toBe("no such revision");
  });

  it("hands back a report larger than a megabyte whole, because a truncated one parses as a syntax error somewhere else", () => {
    const wide = 2_000_000;

    const completed = run(node, [
      "-e",
      `process.stdout.write("x".repeat(${wide}))`,
    ]);

    expect(completed.stdout).toHaveLength(wide);
  });

  it("refuses a command it could not start, naming the command and the reason", () => {
    expect(() =>
      run("no-such-command-in-this-report", ["--json", "--quiet"]),
    ).toThrow("no-such-command-in-this-report --json --quiet\nspawnSync");
  });
});
