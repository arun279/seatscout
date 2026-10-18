import { existsSync, readFileSync } from "node:fs";
import { findings } from "./findings.ts";
import { judgedFrom } from "./results.ts";

interface Writer {
  readonly write: (text: string) => void;
}

const read = (path: string) =>
  existsSync(path) ? readFileSync(path, "utf8") : null;

export const main = (argv: readonly string[], out: Writer): number => {
  const [dir, run] = argv.slice(2);
  if (run === undefined) {
    out.write(
      "Name the directory the mutation jobs' results are in, then the run's address.\n",
    );
    return 1;
  }
  const { found, body } = findings(judgedFrom(dir, read), run);
  out.write(`${body}\n`);
  return found ? 2 : 0;
};
