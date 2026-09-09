import { heapReported, judged } from "./ratchet.ts";
import { samplesIn } from "./samples.ts";
import { vitalsJudged } from "./vitals.ts";

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
    const samples = samplesIn(text);
    if (samples === null)
      err.write(
        `${path} holds no list of journeys carrying firstSeatGroupsMs\n`,
      );
    return samples;
  };

  const head = journeysAt(headPath);
  if (head === null) return 1;
  const base = basePath === undefined ? null : journeysAt(basePath);
  if (basePath !== undefined && base === null) return 1;

  const vitals = vitalsJudged(head);
  const moment = judged(head, base);
  const passed = vitals.passed && moment.passed;
  (passed ? out : err).write(
    `${[vitals.report, moment.report, heapReported(head, base)].join("\n")}\n`,
  );
  return passed ? 0 : 1;
};
