import { type Reading, readingOf } from "./flashlight.ts";
import { judged } from "./verdict.ts";

interface Writer {
  readonly write: (text: string) => void;
}

const USAGE =
  "usage: device --journey <flashlight.json> (--previous <flashlight.json> | --no-previous)\n";

const argumentAfter = (argv: readonly string[], flag: string) => {
  const at = argv.indexOf(flag);
  return at === -1 ? undefined : argv[at + 1];
};

const pathsIn = (argv: readonly string[]) => {
  const latest = argumentAfter(argv, "--journey");
  const previous = argumentAfter(argv, "--previous") ?? null;
  const alone = argv.includes("--no-previous");
  if (latest === undefined || alone === (previous !== null)) return null;
  return { latest, previous };
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
  const latest = at(paths.latest);
  const previous = paths.previous === null ? null : at(paths.previous);
  if (typeof latest === "string" || typeof previous === "string") {
    err.write(`${typeof latest === "string" ? latest : previous}\n`);
    return 1;
  }
  const { code, report } = judged(latest, previous);
  out.write(report);
  return code;
};
