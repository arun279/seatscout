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
  readonly headGesture: string;
  readonly base: string | null;
  readonly baseGesture: string | null;
}

const USAGE =
  "usage: journey --head <samples.json> --head-gesture <gesture.json> (--base <samples.json> [--base-gesture <gesture.json>] | --no-baseline)\n";

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
  if (head === undefined || headGesture === undefined) return null;
  if (alone === (base !== undefined)) return null;
  if (alone && baseGesture !== undefined) return null;
  return {
    head,
    headGesture,
    base: base ?? null,
    baseGesture: baseGesture ?? null,
  };
};

interface Subjects {
  readonly head: readonly Sample[];
  readonly headGesture: readonly Gesture[];
  readonly base: readonly Sample[] | null;
  readonly baseGesture: readonly Gesture[] | null;
}

const subjectsIn = (
  paths: Paths,
  journeysAt: (path: string) => readonly Sample[] | null,
  gesturesAt: (path: string) => readonly Gesture[] | null,
): Subjects | null => {
  const head = journeysAt(paths.head);
  const headGesture = gesturesAt(paths.headGesture);
  if (head === null || headGesture === null) return null;
  const base = paths.base === null ? null : journeysAt(paths.base);
  if (paths.base !== null && base === null) return null;
  const baseGesture =
    paths.baseGesture === null ? null : gesturesAt(paths.baseGesture);
  if (paths.baseGesture !== null && baseGesture === null) return null;
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
    framesJudged(headGesture, baseGesture),
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
