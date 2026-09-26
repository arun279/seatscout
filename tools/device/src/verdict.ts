import { type Figure, type Reading, tenths } from "./flashlight.ts";

export interface Side {
  readonly startup: Reading;
  readonly journey: Reading;
}

interface Axis {
  readonly name: string;
  readonly unit: string;
  readonly of: (side: Side) => Figure;
  readonly worse: (one: number, other: number) => boolean;
}

const higher = (one: number, other: number) => one > other;
const lower = (one: number, other: number) => one < other;

const AXES: readonly Axis[] = [
  {
    name: "Start-up, launch to the first frame",
    unit: " ms",
    of: (side) => side.startup.runtime,
    worse: higher,
  },
  {
    name: "Walk, as Maestro makes it",
    unit: " ms",
    of: (side) => side.journey.runtime,
    worse: higher,
  },
  {
    name: "Frame rate over the walk",
    unit: " FPS",
    of: (side) => side.journey.fps,
    worse: lower,
  },
  {
    name: "CPU over the walk",
    unit: "%",
    of: (side) => side.journey.cpu,
    worse: higher,
  },
  {
    name: "Memory over the walk",
    unit: " MB",
    of: (side) => side.journey.ram,
    worse: higher,
  },
];

const STEADY = 5;

const RETRY = 3;

const worstOf = (measure: Axis, figure: Figure) =>
  figure.values.reduce((worst, value) =>
    measure.worse(value, worst) ? value : worst,
  );

const alone = (head: Side) => [
  "| Measure | This branch, median | Spread |",
  "| --- | --- | --- |",
  ...AXES.map((measure) => {
    const figure = measure.of(head);
    return `| ${measure.name} | ${figure.median}${measure.unit} | ${figure.spread}% |`;
  }),
];

const beside = (head: Side, base: Side) => [
  "| Measure | This branch, median | Spread | Merge base, worst | Spread |",
  "| --- | --- | --- | --- | --- |",
  ...AXES.map((measure) => {
    const ours = measure.of(head);
    const theirs = measure.of(base);
    return `| ${measure.name} | ${ours.median}${measure.unit} | ${ours.spread}% | ${tenths(worstOf(measure, theirs))}${measure.unit} | ${theirs.spread}% |`;
  }),
];

const held = (head: Side, base: Side, last: boolean) => {
  const widest = Math.max(
    ...[head, base].flatMap((side) =>
      AXES.map((measure) => measure.of(side).spread),
    ),
  );
  if (widest >= STEADY)
    return last
      ? {
          code: 1,
          line: `Could not measure: the widest spread is still ${widest}% with twice the iterations, over the ${STEADY} per cent Reassure calls steady.`,
        }
      : {
          code: RETRY,
          line: `The widest spread is ${widest}%, over the ${STEADY} per cent Reassure calls steady, so the reading is taken again with twice the iterations.`,
        };
  const worse = AXES.filter((measure) =>
    measure.worse(measure.of(head).median, worstOf(measure, measure.of(base))),
  );
  return worse.length > 0
    ? {
        code: 1,
        line: `Worse than the merge base's worst iteration: ${worse.map((measure) => measure.name).join(", ")}.`,
      }
    : {
        code: 0,
        line: `No figure is worse than the merge base's worst iteration, and the widest spread is ${widest}%, under the ${STEADY} per cent Reassure calls steady.`,
      };
};

export const judged = (
  head: Side,
  base: Side | null,
  last: boolean,
): { readonly code: number; readonly report: string } => {
  const verdict =
    base === null
      ? {
          code: 0,
          line: "The merge base has no walk to measure, so nothing here is held to one.",
        }
      : held(head, base, last);
  return {
    code: verdict.code,
    report: [
      "### On the Android emulator",
      "",
      `Flashlight on one emulator, the merge base first, each over ${head.startup.iterations} iterations of start-up and ${head.journey.iterations} of the walk, with the app's data cleared before each. This branch's median over its iterations stands beside the merge base's worst; the spread is the standard deviation across iterations as a share of the mean.`,
      "",
      ...(base === null ? alone(head) : beside(head, base)),
      "",
      verdict.line,
      "",
    ].join("\n"),
  };
};
