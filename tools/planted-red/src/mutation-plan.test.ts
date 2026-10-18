import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { copyMutationTools, IGNORED } from "./planted.fixtures.ts";

const SOURCE = "apps/app/src/letters.ts";
const LETTERS = [..."abcdefghijklmnopqrstuvwxyz"];
const STATEMENT = `export const letters = () => [${LETTERS.map((letter) => `"${letter}"`).join(", ")}];`;
const ONE_A_LINE = LETTERS.map(
  (letter) => `export const ${letter} = () => "${letter}";`,
);
const PER_JOB = 12;

type Job = { shard: string; files: string; mutants: number };

const outsideAnyRepository = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")),
);

const IDENTITY = [
  "-c",
  "user.name=planted",
  "-c",
  "user.email=planted@example.invalid",
];

const plannedOver = (
  sources: Readonly<Record<string, string>>,
  shard: Readonly<Record<string, unknown>> = {
    runner: "jest",
    mutantsPerJob: PER_JOB,
  },
  before: Readonly<Record<string, string>> = {},
): Job[] => {
  mkdirSync(IGNORED, { recursive: true });
  const at = mkdtempSync(join(IGNORED, "plan-"));
  const run = (command: string, ...args: string[]) =>
    spawnSync(command, args, {
      cwd: at,
      encoding: "utf8",
      env: outsideAnyRepository,
    });
  const committed = (message: string) => {
    run("git", "add", "apps");
    run("git", ...IDENTITY, "commit", "--quiet", "--message", message);
  };
  const written = (files: Readonly<Record<string, string>>) => {
    for (const [file, source] of Object.entries(files))
      writeFileSync(join(at, file), `${source}\n`);
  };
  try {
    const tool = copyMutationTools(at);
    mkdirSync(join(at, "apps/app/src"), { recursive: true });
    written({ "apps/app/src/index.ts": "export {};", ...before });
    writeFileSync(
      join(at, "stryker.shards.json"),
      JSON.stringify([
        {
          id: "app",
          mutate: ["apps/app/src/**/*.{ts,tsx}"],
          canary: "apps/app/src/index.ts",
          ...shard,
        },
      ]),
    );
    run("git", "init", "--quiet");
    committed("base");
    written(sources);
    committed("change");
    const planned = run("node", resolve(tool), "--plan", "HEAD~1");
    expect(planned.status, planned.stderr).toBe(0);
    return JSON.parse(planned.stdout);
  } finally {
    rmSync(at, { recursive: true, force: true });
  }
};

const spanIn = (lines: readonly string[], text: string, file = SOURCE) => {
  const line = lines.findIndex((each) => each.includes(text));
  const from = lines[line]?.indexOf(text) ?? -1;
  return `${file}:${line + 1}:${from}-${line + 1}:${from + text.length}`;
};

const rangesIn = (jobs: readonly Job[]) =>
  jobs.flatMap((job) => job.files.split(","));

describe("the mutation plan", () => {
  it("judges one place on a changed line however many mutants the line holds: the first Stryker makes there", () => {
    const arrow = STATEMENT.slice(STATEMENT.indexOf("()"), -1);

    expect(plannedOver({ [SOURCE]: STATEMENT })).toEqual([
      { shard: "app", files: spanIn([STATEMENT], arrow), mutants: 1 },
    ]);
  });

  it("judges a place on every changed line", () => {
    const ranges = rangesIn(plannedOver({ [SOURCE]: ONE_A_LINE.join("\n") }));

    expect(ranges).toEqual(
      LETTERS.map((letter) => spanIn(ONE_A_LINE, `() => "${letter}"`)),
    );
  });

  it("packs the places into jobs of at most the shard's mutants per job", () => {
    const jobs = plannedOver({ [SOURCE]: ONE_A_LINE.join("\n") });

    expect(jobs.map((job) => job.mutants)).toEqual([PER_JOB, PER_JOB, 2]);
  });

  it("gives a place holding more mutants than a job allows a job of its own, since Stryker cannot judge part of a place", () => {
    const comparison = 's === "light"';
    const source = `declare const s: string; export const up = ${comparison};`;
    const range = spanIn([source], comparison);

    const holding = plannedOver(
      { [SOURCE]: source },
      { runner: "jest", mutantsPerJob: 2 },
    ).filter((job) => job.files.split(",").includes(range));

    expect(holding).toEqual([{ shard: "app", files: range, mutants: 3 }]);
  });

  it("names each Vitest place by its exact range too, and holds up to eight files in a job", () => {
    const files = Array.from(
      { length: 9 },
      (_, index) => `apps/app/src/file-${index}.ts`,
    );
    const source = 'export const named = () => "named";';

    const jobs = plannedOver(
      Object.fromEntries(files.map((file) => [file, source])),
      { runner: "vitest" },
    );

    expect(jobs).toEqual([
      {
        shard: "app",
        files: files
          .slice(0, 8)
          .map((file) => spanIn([source], '() => "named"', file))
          .join(","),
        mutants: 8,
      },
      {
        shard: "app",
        files: spanIn([source], '() => "named"', files[8]),
        mutants: 1,
      },
    ]);
  });

  it("mutates nothing for a change to a test alone, since it changes no line of the source", () => {
    expect(
      plannedOver(
        { "apps/app/src/letters.test.ts": 'import "./letters.ts";' },
        undefined,
        { [SOURCE]: STATEMENT },
      ),
    ).toEqual([]);
  });

  it("plans nothing for a change that holds no mutant", () => {
    expect(plannedOver({ [SOURCE]: "export type Letter = string;" })).toEqual(
      [],
    );
  });
});
