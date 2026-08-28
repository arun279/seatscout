import { existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
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

  it("runs the command in the directory it is given", () => {
    const directory = shell.temporary();

    expect(
      shell.run(node, ["-e", "process.stdout.write(process.cwd())"], directory)
        .stdout,
    ).toContain(basename(directory));

    shell.discard(directory);
  });
});

describe("temporary directories", () => {
  it("names them so a leaked one is identifiable, under the system temporary root", () => {
    const directory = shell.temporary();

    expect(basename(directory).startsWith("footprint-")).toBe(true);
    expect(dirname(directory)).toBe(tmpdir());

    shell.discard(directory);
  });

  it("discards a directory along with what is inside it", () => {
    const directory = shell.temporary();
    writeFileSync(join(directory, "tree.tar"), "");

    shell.discard(directory);

    expect(existsSync(directory)).toBe(false);
  });
});
