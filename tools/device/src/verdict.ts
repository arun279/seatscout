import { type Figure, type Reading, tenths } from "./flashlight.ts";

export interface Side {
  readonly startup: Figure;
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
    name: "Start-up, a cold launch to the first frame",
    unit: " ms",
    of: (side) => side.startup,
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

const worstOf = (axis: Axis, figure: Figure) =>
  figure.values.reduce((worst, value) =>
    axis.worse(value, worst) ? value : worst,
  );

const spreadOf = (axis: Axis, head: Side, base: Side | null) =>
  Math.max(axis.of(head).spread, base === null ? 0 : axis.of(base).spread);

const row = (axis: Axis, head: Side, base: Side | null) => {
  const ours = axis.of(head);
  const cells = [axis.name, `${ours.median}${axis.unit}`, `${ours.spread}%`];
  if (base !== null) {
    const theirs = axis.of(base);
    cells.push(
      `${tenths(worstOf(axis, theirs))}${axis.unit}`,
      `${theirs.spread}%`,
    );
  }
  return `| ${cells.join(" | ")} |`;
};

const table = (axes: readonly Axis[], head: Side, base: Side | null) =>
  axes.length === 0
    ? []
    : [
        base === null
          ? "| Measure | This branch, median | Spread |"
          : "| Measure | This branch, median | Spread | Merge base, worst | Spread |",
        base === null
          ? "| --- | --- | --- |"
          : "| --- | --- | --- | --- | --- |",
        ...axes.map((axis) => row(axis, head, base)),
        "",
      ];

const named = (axes: readonly Axis[], head: Side, base: Side | null) =>
  axes
    .map((axis) => `${axis.name} (${spreadOf(axis, head, base)}%)`)
    .join(", ");

const verdictOf = (kept: readonly Axis[], head: Side, base: Side | null) => {
  if (base === null)
    return {
      code: 0,
      line: "The merge base has no walk to measure, so nothing here is held to one.",
    };
  const worse = kept.filter((axis) =>
    axis.worse(axis.of(head).median, worstOf(axis, axis.of(base))),
  );
  return worse.length > 0
    ? {
        code: 1,
        line: `Worse than the merge base's worst iteration: ${worse.map((axis) => axis.name).join(", ")}.`,
      }
    : {
        code: 0,
        line: "No figure held here is worse than the merge base's worst iteration.",
      };
};

export const judged = (
  head: Side,
  base: Side | null,
  last: boolean,
): { readonly code: number; readonly report: string } => {
  const unsteady = AXES.filter((axis) => spreadOf(axis, head, base) >= STEADY);
  const retry = base !== null && !last && unsteady.length > 0;
  const kept = retry ? AXES : AXES.filter((axis) => !unsteady.includes(axis));
  const verdict = retry
    ? {
        code: RETRY,
        line: `At or over the ${STEADY} per cent Reassure calls steady: ${named(unsteady, head, base)}, so the reading is taken again with twice the iterations.`,
      }
    : verdictOf(kept, head, base);
  return {
    code: verdict.code,
    report: [
      "### On the Android emulator",
      "",
      `One emulator, the merge base first. Start-up is the platform's own cold-launch timing, \`am start -W\` TotalTime, over ${head.startup.values.length} cold launches; the walk is Flashlight over ${head.journey.iterations} iterations with the app's data cleared before each. This branch's median stands beside the merge base's worst; the spread is the standard deviation as a share of the mean, and a measure is held only while it stays under the ${STEADY} per cent Reassure calls steady.`,
      "",
      ...table(kept, head, base),
      ...(retry || unsteady.length === 0
        ? []
        : [
            `Left out, too unsteady to hold: ${named(unsteady, head, base)}.`,
            "",
          ]),
      verdict.line,
      "",
    ].join("\n"),
  };
};
