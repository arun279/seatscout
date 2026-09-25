import { type Reading, readingOf } from "./flashlight.ts";

interface Writer {
  readonly write: (text: string) => void;
}

const USAGE =
  "usage: device --startup <flashlight.json> --journey <flashlight.json>\n";

const argumentAfter = (argv: readonly string[], flag: string) => {
  const at = argv.indexOf(flag);
  return at === -1 ? undefined : argv[at + 1];
};

const row = (measure: string, average: string, spread: number) =>
  `| ${measure} | ${average} | ${spread}% |`;

const sectionOf = (startup: Reading, journey: Reading): string => {
  const widest = Math.max(
    startup.runtimeSpread,
    journey.runtimeSpread,
    journey.fpsSpread,
    journey.cpuSpread,
    journey.ramSpread,
  );
  return [
    "### On the Android emulator",
    "",
    `Flashlight's own averages over ${startup.iterations} iterations of start-up and ${journey.iterations} of the journey, with the app stopped before each, and the spread across iterations as Flashlight's coefficient of variation.`,
    "",
    "| Measure | Average | Spread |",
    "| --- | --- | --- |",
    row(
      "Start-up, to the first frame",
      `${startup.runtime} ms`,
      startup.runtimeSpread,
    ),
    row(
      "Journey, from a cold start",
      `${journey.runtime} ms`,
      journey.runtimeSpread,
    ),
    row("Frame rate over the journey", `${journey.fps} FPS`, journey.fpsSpread),
    row("CPU over the journey", `${journey.cpu}%`, journey.cpuSpread),
    row("Memory over the journey", `${journey.ram} MB`, journey.ramSpread),
    "",
    `The widest spread across iterations is ${widest}%.`,
    "",
  ].join("\n");
};

export const main = (
  argv: readonly string[],
  read: (path: string) => string | null,
  out: Writer,
  err: Writer,
): number => {
  const given = argv.slice(2);
  const startupPath = argumentAfter(given, "--startup");
  const journeyPath = argumentAfter(given, "--journey");
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
