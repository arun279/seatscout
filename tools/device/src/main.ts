import { type Reading, readingOf } from "./flashlight.ts";
import { judged } from "./verdict.ts";

interface Writer {
  readonly write: (text: string) => void;
}

const USAGE =
  "usage: device --head-journey <flashlight.json> (--base-journey <flashlight.json> | --no-baseline)\n";

const argumentAfter = (argv: readonly string[], flag: string) => {
  const at = argv.indexOf(flag);
  return at === -1 ? undefined : argv[at + 1];
};

const pathsIn = (argv: readonly string[]) => {
  const head = argumentAfter(argv, "--head-journey");
  const base = argumentAfter(argv, "--base-journey") ?? null;
  const alone = argv.includes("--no-baseline");
  if (head === undefined || alone === (base !== null)) return null;
  return { head, base };
};

export const main = (
  argv: readonly string[],
  read: (path: string) => string | null,
  out: Writer,
  err: Writer,
): number => {
  const paths = pathsIn(argv);
  if (paths === null) {
    err.write(USAGE);
    return 2;
  }
  const at = (path: string): Reading | string => {
    const text = read(path);
    return text === null ? `${path} was never written` : readingOf(path, text);
  };
  const head = at(paths.head);
  const base = paths.base === null ? null : at(paths.base);
  if (typeof head === "string" || typeof base === "string") {
    err.write(`${typeof head === "string" ? head : base}\n`);
    return 1;
  }
  const { code, report } = judged(head, base);
  out.write(report);
  return code;
};
