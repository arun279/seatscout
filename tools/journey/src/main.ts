import {
  blockingJudged,
  blockingReported,
  framesJudged,
  heapReported,
  judged,
} from "./ratchet.ts";
import { type Gesture, gesturesIn, type Sample, samplesIn } from "./samples.ts";
import { vitalsJudged } from "./vitals.ts";

interface Writer {
  readonly write: (text: string) => void;
}

interface Paths {
  readonly head: string;
  readonly headGesture: string | null;
  readonly base: string | null;
  readonly baseGesture: string | null;
}

const USAGE =
  "usage: journey --head <samples.json> (--head-gesture <gesture.json> | --no-gesture) (--base <samples.json> [--base-gesture <gesture.json>] | --no-baseline)\n";

const argumentAfter = (argv: readonly string[], flag: string) => {
  const at = argv.indexOf(flag);
  return at === -1 ? undefined : argv[at + 1];
};

const pathsIn = (given: readonly string[]): Paths | null => {
  const head = argumentAfter(given, "--head");
  const headGesture = argumentAfter(given, "--head-gesture");
  const base = argumentAfter(given, "--base");
  const baseGesture = argumentAfter(given, "--base-gesture");
  const alone = given.includes("--no-baseline");
  const still = given.includes("--no-gesture");
  if (head === undefined || still === (headGesture !== undefined)) return null;
  if (alone === (base !== undefined)) return null;
  if ((alone || still) && baseGesture !== undefined) return null;
  return {
    head,
    headGesture: headGesture ?? null,
    base: base ?? null,
    baseGesture: baseGesture ?? null,
  };
};

interface Subjects {
  readonly head: readonly Sample[];
  readonly headGesture: readonly Gesture[] | null;
  readonly base: readonly Sample[] | null;
  readonly baseGesture: readonly Gesture[] | null;
}

const REFUSED: unique symbol = Symbol();

const readIf = <Reading>(
  path: string | null,
  at: (path: string) => Reading | null,
): Reading | null | typeof REFUSED =>
  path === null ? null : (at(path) ?? REFUSED);

const subjectsIn = (
  paths: Paths,
  journeysAt: (path: string) => readonly Sample[] | null,
  gesturesAt: (path: string) => readonly Gesture[] | null,
): Subjects | null => {
  const head = journeysAt(paths.head);
  if (head === null) return null;
  const headGesture = readIf(paths.headGesture, gesturesAt);
  const base = readIf(paths.base, journeysAt);
  const baseGesture = readIf(paths.baseGesture, gesturesAt);
  if (headGesture === REFUSED || base === REFUSED || baseGesture === REFUSED)
    return null;
  return { head, headGesture, base, baseGesture };
};

export const main = (
  argv: readonly string[],
  read: (path: string) => string | null,
  out: Writer,
  err: Writer,
): number => {
  const paths = pathsIn(argv.slice(2));
  if (paths === null) {
    err.write(USAGE);
    return 2;
  }

  const listAt = <Reading>(
    path: string,
    parse: (text: string) => readonly Reading[] | null,
    carrying: string,
  ): readonly Reading[] | null => {
    const text = read(path);
    if (text === null) {
      err.write(`${path} was never written\n`);
      return null;
    }
    const list = parse(text);
    if (list === null) err.write(`${path} holds no list of ${carrying}\n`);
    return list;
  };

  const subjects = subjectsIn(
    paths,
    (path) =>
      listAt<Sample>(path, samplesIn, "journeys carrying firstSeatGroupsMs"),
    (path) =>
      listAt<Gesture>(path, gesturesIn, "gestures carrying droppedFrames"),
  );
  if (subjects === null) return 1;
  const { head, headGesture, base, baseGesture } = subjects;

  const verdicts = [
    vitalsJudged(head),
    judged(head, base),
    blockingJudged(head, base),
    ...(headGesture === null ? [] : [framesJudged(headGesture, baseGesture)]),
  ];
  const passed = verdicts.every((verdict) => verdict.passed);
  (passed ? out : err).write(
    `${[
      ...verdicts.map((verdict) => verdict.report),
      blockingReported(head),
      heapReported(head, base),
    ].join("\n")}\n`,
  );
  return passed ? 0 : 1;
};
