import { spawnSync } from "node:child_process";

export interface Completed {
  readonly ok: boolean;
  readonly stdout: string;
  readonly stderr: string;
}

export interface Shell {
  readonly run: (command: string, args: readonly string[]) => Completed;
}

export const shell: Shell = {
  run: (command, args) => {
    const { status, stdout, stderr } = spawnSync(command, args, {
      encoding: "utf8",
    });
    return { ok: status === 0, stdout, stderr };
  },
};
