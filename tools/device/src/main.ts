import { type Figure, type Reading, readingOf } from "./flashlight.ts";

interface Writer {
  readonly write: (text: string) => void;
}

const USAGE =
  "usage: device --startup <flashlight.json> --journey <flashlight.json>\n";

const argumentAfter = (argv: readonly string[], flag: string) => {
  const at = argv.indexOf(flag);
  return at === -1 ? undefined : argv[at + 1];
};

const row = (measure: string, unit: string, { mean, spread }: Figure) =>
  `| ${measure} | ${mean}${unit} | ${spread}% |`;

const sectionOf = (startup: Reading, journey: Reading): string =>
  [
    "### On the Android emulator",
    "",
    `Flashlight over ${startup.iterations} iterations of start-up and ${journey.iterations} of the journey, with the app's data cleared before each. Each figure is the mean over iterations; the spread is the standard deviation across iterations as a share of that mean.`,
    "",
    "| Measure | Mean | Spread |",
    "| --- | --- | --- |",
    row("Start-up, launch to the first frame", " ms", startup.runtime),
    row("Journey, as Maestro walks it", " ms", journey.runtime),
    row("Frame rate over the journey", " FPS", journey.fps),
    row("CPU over the journey", "%", journey.cpu),
    row("Memory over the journey", " MB", journey.ram),
    "",
    `The widest spread across iterations is ${Math.max(
      ...[
        startup.runtime,
        journey.runtime,
        journey.fps,
        journey.cpu,
        journey.ram,
      ].map((figure) => figure.spread),
    )}%.`,
    "",
  ].join("\n");

export const main = (
  argv: readonly string[],
  read: (path: string) => string | null,
  out: Writer,
  err: Writer,
): number => {
  const startupPath = argumentAfter(argv, "--startup");
  const journeyPath = argumentAfter(argv, "--journey");
  if (startupPath === undefined || journeyPath === undefined) {
    err.write(USAGE);
    return 2;
  }
  const readingAt = (path: string) => {
    const text = read(path);
    return text === null ? `${path} was never written` : readingOf(path, text);
  };
  const startup = readingAt(startupPath);
  const journey = readingAt(journeyPath);
  if (typeof startup === "string" || typeof journey === "string") {
    err.write(`${typeof startup === "string" ? startup : journey}\n`);
    return 1;
  }
  out.write(sectionOf(startup, journey));
  return 0;
};
