import { spawnSync } from "node:child_process";

export interface Completed {
  readonly ok: boolean;
  readonly stdout: string;
  readonly stderr: string;
}

export type Run = (command: string, args: readonly string[]) => Completed;

export const run: Run = (command, args) => {
  const { status, stdout, stderr, error } = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: Number.POSITIVE_INFINITY,
  });
  if (error !== undefined)
    throw new Error(`${command} ${args.join(" ")}\n${error.message}`);
  return { ok: status === 0, stdout, stderr };
};
