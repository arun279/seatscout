import { describe, expect, it } from "vitest";
import { shell } from "./shell.js";

const node = process.execPath;

describe("running a command", () => {
  it("hands back what the command printed", () => {
    const completed = shell.run(node, [
      "-e",
      "process.stdout.write('forty two')",
    ]);

    expect(completed).toStrictEqual({
      ok: true,
      stdout: "forty two",
      stderr: "",
    });
  });

  it("carries the reason a command failed rather than its output", () => {
    const completed = shell.run(node, [
      "-e",
      "process.stderr.write('no such revision'); process.exit(2)",
    ]);

    expect(completed.ok).toBe(false);
    expect(completed.stderr).toBe("no such revision");
  });
});
