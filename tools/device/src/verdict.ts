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

const spreadOf = (axis: Axis, head: Reading, base: Reading | null) =>
  Math.max(axis.of(head).spread, base === null ? 0 : axis.of(base).spread);

const row = (axis: Axis, head: Reading, base: Reading | null) => {
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

const table = (axes: readonly Axis[], head: Reading, base: Reading | null) =>
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

const verdictOf = (
  kept: readonly Axis[],
  head: Reading,
  base: Reading | null,
) => {
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
  head: Reading,
  base: Reading | null,
): { readonly code: number; readonly report: string } => {
  const unsteady = AXES.filter((axis) => spreadOf(axis, head, base) >= STEADY);
  const kept = AXES.filter((axis) => !unsteady.includes(axis));
  const verdict = verdictOf(kept, head, base);
  return {
    code: verdict.code,
    report: [
      "### On the Android emulator",
      "",
      `One emulator, the merge base first. The walk is Flashlight over ${head.iterations} iterations with the app's data cleared before each. This branch's median stands beside the merge base's worst; the spread is the standard deviation as a share of the mean, and a measure is held only while it stays under the ${STEADY} per cent Reassure calls steady.`,
      "",
      ...table(kept, head, base),
      ...(unsteady.length === 0
        ? []
        : [
            `Left out, too unsteady to hold: ${unsteady
              .map((axis) => `${axis.name} (${spreadOf(axis, head, base)}%)`)
              .join(", ")}.`,
            "",
          ]),
      verdict.line,
      "",
    ].join("\n"),
  };
};
