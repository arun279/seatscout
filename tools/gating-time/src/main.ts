import {
  type Chain,
  type Declarations,
  type Declared,
  type Job,
  type Spent,
  timed,
} from "./gating.ts";

interface Writer {
  readonly write: (text: string) => void;
}

export type Read = (command: string, args: readonly string[]) => string;

const BUDGET_SECONDS = 600;

const USAGE =
  "usage: gating-time --workflow <workflow file> --run <run id> --job <the job that measures>\n";

const GUIDELINE =
  "the ten-minute guideline for the build that gates a change, from [Martin Fowler's Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html#build-fast)";

const HEADING = "### Gating time\n\n";

const isObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  value instanceof Object;

const textOf = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const declaredOf = (raw: unknown): Declared => {
  const { name, needs } = isObject(raw) ? raw : {};
  return {
    name: textOf(name),
    needs: [needs]
      .flat()
      .filter((need): need is string => typeof need === "string"),
  };
};

const declarationsOf = (text: string): Declarations => {
  const parsed: unknown = JSON.parse(text);
  return isObject(parsed)
    ? Object.fromEntries(
        Object.entries(parsed).map(([id, raw]) => [id, declaredOf(raw)]),
      )
    : {};
};

const jobOf = (raw: unknown): Job => {
  const { name, conclusion, started_at, completed_at } = isObject(raw)
    ? raw
    : {};
  return {
    name: String(name),
    conclusion: textOf(conclusion),
    started_at: textOf(started_at),
    completed_at: textOf(completed_at),
  };
};

const jobsOf = (text: string): readonly Job[] | null => {
  const pages: unknown = JSON.parse(text);
  if (!Array.isArray(pages)) return null;
  const jobs = pages.map((page) => (isObject(page) ? page["jobs"] : null));
  return jobs.every(Array.isArray) ? jobs.flat().map(jobOf) : null;
};

const durationOf = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest} s`;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
};

const timedText = (measuring: string, chain: Chain, within: boolean): string =>
  [
    `The jobs that gate this change took ${durationOf(chain.seconds)}, ${within ? "within" : "over"} ${GUIDELINE}.`,
    `That is the longest chain of the jobs \`${measuring}\` waits on, each timed from when a runner started it, so time spent queued is not counted: ${chain.links
      .map((link) => `${link.name} (${durationOf(link.seconds)})`)
      .join(", then ")}.`,
    ...(within
      ? []
      : [
          "Make a job in that chain faster, split it into jobs that run side by side, or move it to a later stage that the merge does not wait on.",
        ]),
  ].join(" ");

const spentText = (spent: Spent): string =>
  [
    `Runner time: ${durationOf(spent.seconds)} over ${spent.jobs} jobs.`,
    ...(spent.running.length === 0
      ? []
      : [`Still running, so not counted: ${spent.running.join(", ")}.`]),
  ].join(" ");

const argumentAfter = (argv: readonly string[], flag: string) => {
  const at = argv.indexOf(flag);
  return at === -1 ? undefined : argv[at + 1];
};

const measured = (
  read: Read,
  workflow: string,
  run: string,
  measuring: string,
): { readonly text: string; readonly within: boolean } => {
  const declarations = declarationsOf(
    read("yq", ["--output-format=json", ".jobs", workflow]),
  );
  const jobs = jobsOf(
    read("gh", [
      "api",
      "--paginate",
      "--slurp",
      `repos/{owner}/{repo}/actions/runs/${run}/jobs?per_page=100`,
    ]),
  );
  if (jobs === null)
    throw new Error(
      `GitHub answered run ${run} with something other than pages of jobs.`,
    );
  const { chain, spent } = timed(declarations, measuring, jobs, run);
  const within = chain.seconds <= BUDGET_SECONDS;
  return {
    text: `${HEADING}${timedText(measuring, chain, within)}\n\n${spentText(spent)}\n`,
    within,
  };
};

export const main = (
  argv: readonly string[],
  read: Read,
  out: Writer,
  err: Writer,
): number => {
  const workflow = argumentAfter(argv, "--workflow");
  const run = argumentAfter(argv, "--run");
  const measuring = argumentAfter(argv, "--job");
  if (workflow === undefined || run === undefined || measuring === undefined) {
    err.write(USAGE);
    return 2;
  }
  try {
    const { text, within } = measured(read, workflow, run, measuring);
    out.write(text);
    return within ? 0 : 1;
  } catch (error) {
    out.write(
      `${HEADING}Not measured, so this change is refused: ${error instanceof Error ? error.message : error}\n`,
    );
    return 1;
  }
};
