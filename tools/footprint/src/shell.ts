import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface Completed {
  readonly ok: boolean;
  readonly stdout: string;
  readonly stderr: string;
}

export interface Shell {
  readonly run: (
    command: string,
    args: readonly string[],
    cwd?: string,
  ) => Completed;
  readonly temporary: () => string;
  readonly discard: (path: string) => void;
}

export const shell: Shell = {
  run: (command, args, cwd) => {
    const { status, stdout, stderr } = spawnSync(command, args, {
      cwd,
      encoding: "utf8",
    });
    return { ok: status === 0, stdout, stderr };
  },
  temporary: () => mkdtempSync(join(tmpdir(), "footprint-")),
  discard: (path) => rmSync(path, { recursive: true }),
};
