import { type Figure, type Reading, tenths } from "./flashlight.ts";

interface Axis {
  readonly name: string;
  readonly unit: string;
  readonly of: (side: Reading) => Figure;
  readonly worse: (one: number, other: number) => boolean;
}

const higher = (one: number, other: number) => one > other;
const lower = (one: number, other: number) => one < other;

const AXES: readonly Axis[] = [
  {
    name: "Walk, as Maestro makes it",
    unit: " ms",
    of: (side) => side.runtime,
    worse: higher,
  },
  {
    name: "Frame rate over the walk",
    unit: " FPS",
    of: (side) => side.fps,
    worse: lower,
  },
  {
    name: "CPU over the walk",
    unit: "%",
    of: (side) => side.cpu,
    worse: higher,
  },
  {
    name: "Memory over the walk",
    unit: " MB",
    of: (side) => side.ram,
    worse: higher,
  },
];

const STEADY = 5;

const worstOf = (axis: Axis, figure: Figure) =>
  figure.values.reduce((worst, value) =>
    axis.worse(value, worst) ? value : worst,
  );

const spreadOf = (axis: Axis, latest: Reading, previous: Reading | null) =>
  Math.max(
    axis.of(latest).spread,
    previous === null ? 0 : axis.of(previous).spread,
  );

const row = (axis: Axis, latest: Reading, previous: Reading | null) => {
  const ours = axis.of(latest);
  const cells = [axis.name, `${ours.median}${axis.unit}`, `${ours.spread}%`];
  if (previous !== null) {
    const theirs = axis.of(previous);
    cells.push(
      `${tenths(worstOf(axis, theirs))}${axis.unit}`,
      `${theirs.spread}%`,
    );
  }
  return `| ${cells.join(" | ")} |`;
};

const table = (
  axes: readonly Axis[],
  latest: Reading,
  previous: Reading | null,
) =>
  axes.length === 0
    ? []
    : [
        previous === null
          ? "| Measure | This commit, median | Spread |"
          : "| Measure | This commit, median | Spread | Previous run, worst | Spread |",
        previous === null
          ? "| --- | --- | --- |"
          : "| --- | --- | --- | --- | --- |",
        ...axes.map((axis) => row(axis, latest, previous)),
        "",
      ];

const verdictOf = (
  kept: readonly Axis[],
  latest: Reading,
  previous: Reading | null,
) => {
  if (previous === null)
    return {
      code: 0,
      line: "No earlier Baseline run left a reading, so nothing here is held to one.",
    };
  const worse = kept.filter((axis) =>
    axis.worse(axis.of(latest).median, worstOf(axis, axis.of(previous))),
  );
  return worse.length > 0
    ? {
        code: 1,
        line: `Worse than the previous run's worst iteration: ${worse.map((axis) => axis.name).join(", ")}.`,
      }
    : {
        code: 0,
        line: "No figure held here is worse than the previous run's worst iteration.",
      };
};

export const judged = (
  latest: Reading,
  previous: Reading | null,
): { readonly code: number; readonly report: string } => {
  const unsteady = AXES.filter(
    (axis) => spreadOf(axis, latest, previous) >= STEADY,
  );
  const kept = AXES.filter((axis) => !unsteady.includes(axis));
  const verdict = verdictOf(kept, latest, previous);
  return {
    code: verdict.code,
    report: [
      "### On the Android emulator",
      "",
      `One emulator, one build of main. The walk is Flashlight over ${latest.iterations} iterations with the app's data cleared before each. This commit's median stands beside the previous Baseline run's worst; the spread is the standard deviation as a share of the mean, and a measure is held only while it stays under the ${STEADY} per cent Reassure calls steady.`,
      "",
      ...table(kept, latest, previous),
      ...(unsteady.length === 0
        ? []
        : [
            `Left out, too unsteady to hold: ${unsteady
              .map(
                (axis) => `${axis.name} (${spreadOf(axis, latest, previous)}%)`,
              )
              .join(", ")}.`,
            "",
          ]),
      verdict.line,
      "",
    ].join("\n"),
  };
};
