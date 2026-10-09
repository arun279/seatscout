import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { copyMutationTools, IGNORED } from "./planted.fixtures.ts";

const SOURCE = "apps/app/src/letters.ts";
const LETTERS = [..."abcdefghijklmnopqrstuvwxyz"].map(
  (letter) => `"${letter}"`,
);
const STATEMENT = `export const letters = () => [${LETTERS.join(", ")}];`;
const PER_JOB = 12;

type Job = { shard: string; files: string; mutants?: number };

const outsideAnyRepository = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")),
);

const IDENTITY = [
  "-c",
  "user.name=planted",
  "-c",
  "user.email=planted@example.invalid",
];

const plannedOver = (source: string, perJob = PER_JOB): Job[] => {
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
  try {
    const tool = copyMutationTools(at);
    mkdirSync(join(at, "apps/app/src"), { recursive: true });
    writeFileSync(join(at, "apps/app/src/index.ts"), "export {};\n");
    writeFileSync(
      join(at, "stryker.shards.json"),
      JSON.stringify([
        {
          id: "app",
          runner: "jest",
          mutate: ["apps/app/src/**/*.{ts,tsx}"],
          mutantsPerJob: perJob,
          canary: "apps/app/src/index.ts",
        },
      ]),
    );
    run("git", "init", "--quiet");
    committed("base");
    writeFileSync(join(at, SOURCE), `${source}\n`);
    committed("change");
    const planned = run("node", resolve(tool), "--plan", "HEAD~1");
    expect(planned.status, planned.stderr).toBe(0);
    return JSON.parse(planned.stdout);
  } finally {
    rmSync(at, { recursive: true, force: true });
  }
};

const spanOf = (text: string, from = STATEMENT.indexOf(text)) =>
  `${SOURCE}:1:${from}-1:${from + text.length}`;

const rangesIn = (jobs: readonly Job[]) =>
  jobs.flatMap((job) => job.files.split(","));

describe("the mutation plan under Jest", () => {
  it("splits one statement holding 28 mutants into ceil(28 / 12) jobs of at most 12", () => {
    const jobs = plannedOver(STATEMENT);

    expect(jobs.map((job) => job.mutants)).toEqual([PER_JOB, PER_JOB, 4]);
    expect(jobs.every((job) => job.shard === "app")).toBe(true);
  });

  it("names every string's own location in some job", () => {
    const ranges = rangesIn(plannedOver(STATEMENT));
    let from = 0;
    for (const letter of LETTERS) {
      from = STATEMENT.indexOf(letter, from);
      expect(ranges).toContain(spanOf(letter, from));
    }
  });

  it("keeps the mutants that hold others: the function and the array it returns", () => {
    const ranges = rangesIn(plannedOver(STATEMENT));

    expect(ranges).toContain(
      spanOf(STATEMENT.slice(STATEMENT.indexOf("["), -1)),
    );
    expect(ranges).toContain(
      spanOf(STATEMENT.slice(STATEMENT.indexOf("()"), -1)),
    );
  });

  it("gives a range holding more mutants than a job allows a job of its own, since a range cannot be split", () => {
    const comparison = 's === "light"';
    const source = `export const up = (s: string) => ${comparison} ? "up" : "down";`;
    const from = source.indexOf(comparison);
    const range = `${SOURCE}:1:${from}-1:${from + comparison.length}`;

    const holding = plannedOver(source, 2).filter((job) =>
      job.files.split(",").includes(range),
    );

    expect(holding).toEqual([{ shard: "app", files: range, mutants: 3 }]);
  });

  it("plans nothing for a change that holds no mutant", () => {
    expect(plannedOver("export type Letter = string;")).toEqual([]);
  });
});
