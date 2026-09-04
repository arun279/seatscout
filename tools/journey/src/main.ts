import { firstSeatGroupsIn, judged } from "./ratchet.ts";

interface Writer {
  readonly write: (text: string) => void;
}

const USAGE =
  "usage: journey --head <samples.json> (--base <samples.json> | --no-baseline)\n";

const argumentAfter = (argv: readonly string[], flag: string) => {
  const at = argv.indexOf(flag);
  return at === -1 ? undefined : argv[at + 1];
};

export const main = (
  argv: readonly string[],
  read: (path: string) => string | null,
  out: Writer,
  err: Writer,
): number => {
  const given = argv.slice(2);
  const headPath = argumentAfter(given, "--head");
  const basePath = argumentAfter(given, "--base");
  const noBaseline = given.includes("--no-baseline");
  if (headPath === undefined || noBaseline === (basePath !== undefined)) {
    err.write(USAGE);
    return 2;
  }

  const journeysAt = (path: string) => {
    const text = read(path);
    if (text === null) {
      err.write(`${path} was never written\n`);
      return null;
    }
    const moments = firstSeatGroupsIn(text);
    if (moments === null)
      err.write(
        `${path} holds no list of journeys carrying firstSeatGroupsMs\n`,
      );
    return moments;
  };

  const head = journeysAt(headPath);
  if (head === null) return 1;
  const base = basePath === undefined ? null : journeysAt(basePath);
  if (basePath !== undefined && base === null) return 1;

  const verdict = judged(head, base);
  (verdict.passed ? out : err).write(`${verdict.report}\n`);
  return verdict.passed ? 0 : 1;
};
