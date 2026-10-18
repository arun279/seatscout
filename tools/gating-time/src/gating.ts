export interface Job {
  readonly name: string;
  readonly conclusion: string | null;
  readonly started_at: string | null;
  readonly completed_at: string | null;
}

export interface Declared {
  readonly name: string | null;
  readonly needs: readonly string[];
}

export type Declarations = Readonly<Record<string, Declared>>;

interface Link {
  readonly name: string;
  readonly seconds: number;
}

export interface Chain {
  readonly links: readonly Link[];
  readonly seconds: number;
}

export interface Spent {
  readonly seconds: number;
  readonly jobs: number;
  readonly running: readonly string[];
}

const NOTHING: Chain = { links: [], seconds: 0 };

const secondsOf = (job: Job): number | null =>
  job.started_at === null || job.completed_at === null
    ? null
    : (Date.parse(job.completed_at) - Date.parse(job.started_at)) / 1000;

const runsAs = (id: string, declared: Declared) => {
  const template = declared.name ?? id;
  const at = template.indexOf("${{");
  return (job: Job): boolean =>
    at === -1
      ? job.name === template
      : job.name.startsWith(template.slice(0, at));
};

const longer = (one: Chain, other: Chain): Chain =>
  other.seconds > one.seconds ? other : one;

const slowestOf = (jobs: readonly Job[]): Link | null => {
  let slowest: Link | null = null;
  for (const job of jobs) {
    const seconds = secondsOf(job);
    if (seconds === null)
      throw new Error(
        `${job.name} has not run to its end, so how long the change waited on it is not known.`,
      );
    if (
      job.conclusion !== "skipped" &&
      (slowest === null || seconds > slowest.seconds)
    )
      slowest = { name: job.name, seconds };
  }
  return slowest;
};

const spentBy = (others: readonly Job[]): Spent => {
  const ran = others.flatMap((job) => {
    const seconds = secondsOf(job);
    return seconds === null || job.conclusion === "skipped" ? [] : [seconds];
  });
  return {
    seconds: ran.reduce((sum, seconds) => sum + seconds, 0),
    jobs: ran.length,
    running: others
      .filter((job) => secondsOf(job) === null)
      .map((job) => job.name),
  };
};

export const timed = (
  declarations: Declarations,
  measuring: string,
  jobs: readonly Job[],
  run: string,
): { readonly chain: Chain; readonly spent: Spent } => {
  const declaredAs = (id: string): Declared => {
    const declared = declarations[id];
    if (declared === undefined)
      throw new Error(`The workflow declares no job called \`${id}\`.`);
    return declared;
  };
  const through = (id: string): Chain => {
    const declared = declaredAs(id);
    const ran = jobs.filter(runsAs(id, declared));
    if (ran.length === 0)
      throw new Error(
        `${id}, which \`${measuring}\` waits on, ran as no job in run ${run}.`,
      );
    const slowest = slowestOf(ran);
    const before = declared.needs.map(through).reduce(longer, NOTHING);
    return slowest === null
      ? before
      : {
          links: [...before.links, slowest],
          seconds: before.seconds + slowest.seconds,
        };
  };
  const measurer = declaredAs(measuring);
  if (measurer.needs.length === 0)
    throw new Error(
      `\`${measuring}\` waits on no job, so there is no gate to time.`,
    );
  return {
    chain: measurer.needs.map(through).reduce(longer, NOTHING),
    spent: spentBy(jobs.filter((job) => !runsAs(measuring, measurer)(job))),
  };
};
