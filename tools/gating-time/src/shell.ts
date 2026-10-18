import { spawnSync } from "node:child_process";

export const read = (command: string, args: readonly string[]): string => {
  const { status, stdout, stderr, error } = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: Number.POSITIVE_INFINITY,
  });
  if (status === 0) return stdout;
  throw new Error(
    `${command} ${args.join(" ")}\n${error?.message ?? stderr.trim()}`,
  );
};
