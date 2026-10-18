import { globSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const PLANTED = "tools/planted-red/planted/mutation-trigger";
const RUNS_MUTATION = /stryker|tools\/mutation\.mjs|test:mutation/i;
const PULL_REQUEST = ["pull_request", "pull_request_target"];

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const triggersOf = (on: unknown): readonly unknown[] => {
  if (typeof on === "string") return [on];
  if (Array.isArray(on)) return on;
  return isRecord(on) ? Object.keys(on) : [];
};

const onPullRequests = (on: unknown) =>
  triggersOf(on).some(
    (trigger) => typeof trigger === "string" && PULL_REQUEST.includes(trigger),
  );

const mutationOnPullRequests = (path: string): string[] => {
  const workflow: unknown = parse(readFileSync(path, "utf8"));
  if (!isRecord(workflow) || !onPullRequests(workflow["on"])) return [];
  return Object.entries(isRecord(workflow["jobs"]) ? workflow["jobs"] : {})
    .filter(([, job]) => RUNS_MUTATION.test(JSON.stringify(job)))
    .map(([name]) => `${path} ${name}`);
};

describe("mutation runs once per merge, never on a pull request", () => {
  it("finds no workflow job that runs Stryker or tools/mutation.mjs and can trigger on a pull request", () => {
    const workflows = globSync(".github/workflows/*.{yml,yaml}");

    expect(workflows).toContain(".github/workflows/ci.yml");
    expect(workflows.flatMap(mutationOnPullRequests)).toEqual([]);
  });

  it("refuses the planted workflow that runs the mutation tool on pull requests, naming that job alone", () => {
    expect(
      mutationOnPullRequests(`${PLANTED}/on-pull-request.yml.txt`),
    ).toEqual([`${PLANTED}/on-pull-request.yml.txt mutation`]);
  });

  it("refuses the planted workflow that runs Stryker on pull_request_target", () => {
    expect(
      mutationOnPullRequests(
        `${PLANTED}/stryker-on-pull-request-target.yml.txt`,
      ),
    ).toEqual([`${PLANTED}/stryker-on-pull-request-target.yml.txt stryker`]);
  });

  it("refuses the planted workflow that reaches Stryker through an action rather than a command", () => {
    expect(
      mutationOnPullRequests(`${PLANTED}/action-on-pull-request.yml.txt`),
    ).toEqual([`${PLANTED}/action-on-pull-request.yml.txt judge`]);
  });

  it("passes the planted workflow that runs it after a merge, so it is not refusing every mutation job", () => {
    expect(mutationOnPullRequests(`${PLANTED}/after-merge.yml.txt`)).toEqual(
      [],
    );
  });
});
