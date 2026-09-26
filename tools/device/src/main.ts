import { readingOf } from "./flashlight.ts";
import { judged, type Side } from "./verdict.ts";

interface Writer {
  readonly write: (text: string) => void;
}

type Pair = readonly [string, string];

const USAGE =
  "usage: device --head-startup <flashlight.json> --head-journey <flashlight.json> (--base-startup <flashlight.json> --base-journey <flashlight.json> | --no-baseline) [--last]\n";

const argumentAfter = (argv: readonly string[], flag: string) => {
  const at = argv.indexOf(flag);
  return at === -1 ? undefined : argv[at + 1];
};

const pairAfter = (argv: readonly string[], side: string): Pair | null => {
  const startup = argumentAfter(argv, `--${side}-startup`);
  const journey = argumentAfter(argv, `--${side}-journey`);
  return startup === undefined || journey === undefined
    ? null
    : [startup, journey];
};

const pathsIn = (argv: readonly string[]) => {
  const head = pairAfter(argv, "head");
  const base = pairAfter(argv, "base");
  const alone = argv.includes("--no-baseline");
  const partial =
    base === null &&
    ["--base-startup", "--base-journey"].some((flag) => argv.includes(flag));
  if (head === null || partial || alone === (base !== null)) return null;
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
  const readingAt = (path: string) => {
    const text = read(path);
    return text === null ? `${path} was never written` : readingOf(path, text);
  };
  const sideAt = ([startupPath, journeyPath]: Pair): Side | string => {
    const startup = readingAt(startupPath);
    const journey = readingAt(journeyPath);
    if (typeof startup === "string") return startup;
    return typeof journey === "string" ? journey : { startup, journey };
  };
  const head = sideAt(paths.head);
  const base = paths.base === null ? null : sideAt(paths.base);
  if (typeof head === "string" || typeof base === "string") {
    err.write(`${typeof head === "string" ? head : base}\n`);
    return 1;
  }
  const { code, report } = judged(head, base, argv.includes("--last"));
  out.write(report);
  return code;
};
