import { globSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const PLANTED = "tools/planted-red/planted/mutation-trigger";
const RUNS_MUTATION = /stryker|tools\/mutation\.mjs|test:mutation/i;
const PULL_REQUEST = ["pull_request", "pull_request_target"];

interface Workflow {
  readonly on?: string | readonly string[] | Readonly<Record<string, unknown>>;
  readonly jobs?: Readonly<
    Record<string, { readonly steps?: readonly { readonly run?: string }[] }>
  >;
}

const triggersOf = (on: Workflow["on"]): readonly string[] => {
  if (on === undefined) return [];
  if (typeof on === "string") return [on];
  return Array.isArray(on) ? on : Object.keys(on);
};

const mutationOnPullRequests = (path: string): string[] => {
  const workflow: Workflow = parse(readFileSync(path, "utf8"));
  if (!triggersOf(workflow.on).some((on) => PULL_REQUEST.includes(on)))
    return [];
  return Object.entries(workflow.jobs ?? {})
    .filter(([, job]) =>
      (job.steps ?? []).some((step) => RUNS_MUTATION.test(step.run ?? "")),
    )
    .map(([name]) => `${path} ${name}`);
};

describe("mutation runs once per merge, never on a pull request", () => {
  it("finds no workflow job that runs Stryker or tools/mutation.mjs and can trigger on a pull request", () => {
    expect(
      globSync(".github/workflows/*.yml").flatMap(mutationOnPullRequests),
    ).toEqual([]);
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

  it("passes the planted workflow that runs it after a merge, so it is not refusing every mutation job", () => {
    expect(mutationOnPullRequests(`${PLANTED}/after-merge.yml.txt`)).toEqual(
      [],
    );
  });
});
