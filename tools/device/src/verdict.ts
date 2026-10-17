import { type Figure, type Reading, roundedTo } from "./flashlight.ts";

interface Axis {
  readonly name: string;
  readonly unit: string;
  readonly decimals: number;
  readonly of: (side: Reading) => Figure;
  readonly worse: 1 | -1;
  readonly drift: number;
}

const AXES: readonly Axis[] = [
  {
    name: "Walk, as Maestro makes it",
    unit: " ms",
    decimals: 0,
    of: (side) => side.runtime,
    worse: 1,
    drift: 31576,
  },
  {
    name: "Frame rate over the walk",
    unit: " FPS",
    decimals: 1,
    of: (side) => side.fps,
    worse: -1,
    drift: 0.7,
  },
  {
    name: "CPU over the walk",
    unit: "%",
    decimals: 1,
    of: (side) => side.cpu,
    worse: 1,
    drift: 8.8,
  },
  {
    name: "Memory over the walk",
    unit: " MB",
    decimals: 1,
    of: (side) => side.ram,
    worse: 1,
    drift: 6.2,
  },
];

const STEADY = 5;

const PLACES = AXES.map(
  (axis) =>
    `${axis.unit.trim()} to ${axis.decimals} decimal${axis.decimals === 1 ? "" : "s"}`,
).join(", ");

const atPrecision = (axis: Axis, value: number) =>
  roundedTo(value, axis.decimals);

const medianAtPrecision = (axis: Axis, side: Reading) =>
  atPrecision(axis, axis.of(side).median);

const limitOf = (axis: Axis, previous: Reading) =>
  atPrecision(axis, axis.of(previous).median + axis.worse * axis.drift);

const isWorse = (axis: Axis, latest: Reading, previous: Reading) =>
  axis.worse * (medianAtPrecision(axis, latest) - limitOf(axis, previous)) > 0;

const spreadOf = (axis: Axis, latest: Reading, previous: Reading | null) =>
  Math.max(
    axis.of(latest).spread,
    previous === null ? 0 : axis.of(previous).spread,
  );

const row = (axis: Axis, latest: Reading, previous: Reading | null) => {
  const cells = [
    axis.name,
    `${medianAtPrecision(axis, latest)}${axis.unit}`,
    `${axis.of(latest).spread}%`,
  ];
  if (previous !== null) {
    cells.push(
      `${medianAtPrecision(axis, previous)}${axis.unit}`,
      `${axis.of(previous).spread}%`,
      `${limitOf(axis, previous)}${axis.unit}`,
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
          : "| Measure | This commit, median | Spread | Previous run, median | Spread | Worse past |",
        previous === null
          ? "| --- | --- | --- |"
          : "| --- | --- | --- | --- | --- | --- |",
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
  const worse = kept.filter((axis) => isWorse(axis, latest, previous));
  return worse.length > 0
    ? {
        code: 1,
        line: `Worse than the previous run by more than two runs of one build differ: ${worse.map((axis) => axis.name).join(", ")}.`,
      }
    : {
        code: 0,
        line: "No figure held here is worse than the previous run by more than two runs of one build differ.",
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
      `One emulator, one build of main. The walk is Flashlight over ${latest.iterations} iterations with the app's data cleared before each. A measure is worse when this commit's median is past the previous Baseline run's median by more than two runs of one build differ on these runners: three standard deviations of that difference, measured on ten emulators reading one build at once. The spread is the standard deviation as a share of the mean, and a measure is held only while it stays under the ${STEADY} per cent Reassure calls steady. Figures are rounded to the places Flashlight's report gives its averages: ${PLACES}.`,
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
