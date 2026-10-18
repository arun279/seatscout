import { main } from "./main.ts";

interface Ran {
  readonly code: number;
  readonly out: string;
  readonly err: string;
}

interface Job {
  readonly name: string;
  readonly conclusion: string | null;
  readonly started_at: string | null;
  readonly completed_at: string | null;
}

const MUTATION = `mutation (\${{ matrix.shard }} \${{ strategy.job-index }})`;

const GATES = ["changes", "quality", "mutation", "performance", "measure"];

const ci = (gates: readonly string[]) => ({
  changes: { "runs-on": "ubuntu-24.04" },
  quality: { "runs-on": "ubuntu-24.04" },
  mutation: { name: MUTATION, needs: "changes" },
  android: { needs: "changes" },
  performance: { needs: "changes" },
  measure: { "runs-on": "ubuntu-24.04" },
  footprint: { needs: [...gates, "secrets", "dependencies"] },
  secrets: { "runs-on": "ubuntu-24.04" },
  dependencies: { "runs-on": "ubuntu-24.04" },
});

const WORKFLOWS: Readonly<Record<string, object | null>> = {
  "ci.yml": ci(GATES),
  "android-gates.yml": ci([...GATES, "android"]),
  "waits-on-nothing.yml": { footprint: { "runs-on": "ubuntu-24.04" } },
  "gates-a-renamed-job.yml": {
    lint: { name: "Lint the tree" },
    footprint: { needs: "lint" },
  },
  "gates-a-job-the-run-lacks.yml": {
    smoke: {},
    footprint: { needs: ["smoke"] },
  },
  "gates-quality.yml": { quality: {}, footprint: { needs: "quality" } },
  "a-bare-job.yml": { quality: null, footprint: { needs: "quality" } },
  "no-jobs.yml": null,
  "needs-a-ghost.yml": { footprint: { needs: "ghost" } },
  "skips-first.yml": {
    changes: {},
    mutation: { name: MUTATION, needs: "changes" },
    footprint: { needs: ["mutation", "changes"] },
  },
};

const done = (
  name: string,
  started_at: string,
  completed_at: string,
  conclusion = "success",
): Job => ({ name, conclusion, started_at, completed_at });

const running = (name: string, started_at: string): Job => ({
  name,
  conclusion: null,
  started_at,
  completed_at: null,
});

const APP_CHANGE: readonly Job[] = [
  done("secrets", "2026-10-18T01:43:21Z", "2026-10-18T01:43:28Z"),
  done("quality", "2026-10-18T01:44:50Z", "2026-10-18T01:51:32Z"),
  done("dependencies", "2026-10-18T01:46:24Z", "2026-10-18T01:46:44Z"),
  done("changes", "2026-10-18T01:46:27Z", "2026-10-18T01:46:56Z"),
  done("measure", "2026-10-18T01:46:42Z", "2026-10-18T01:54:24Z"),
  done("android", "2026-10-18T01:46:59Z", "2026-10-18T02:05:55Z"),
  done("performance", "2026-10-18T01:46:59Z", "2026-10-18T01:50:37Z"),
  done(MUTATION, "2026-10-18T01:46:56Z", "2026-10-18T01:46:56Z", "skipped"),
  running("footprint", "2026-10-18T02:05:58Z"),
];

const MUTATED: readonly Job[] = [
  done("dependencies", "2026-10-18T01:05:15Z", "2026-10-18T01:05:36Z"),
  done("changes", "2026-10-18T01:05:15Z", "2026-10-18T01:05:49Z"),
  done("secrets", "2026-10-18T01:05:15Z", "2026-10-18T01:05:22Z"),
  done("measure", "2026-10-18T01:05:15Z", "2026-10-18T01:11:08Z"),
  done("quality", "2026-10-18T01:05:15Z", "2026-10-18T01:15:06Z"),
  done("performance", "2026-10-18T01:05:52Z", "2026-10-18T01:09:27Z"),
  done("android", "2026-10-18T01:05:52Z", "2026-10-18T01:17:54Z"),
  done(
    "mutation (native-theme 5)",
    "2026-10-18T01:05:52Z",
    "2026-10-18T01:17:06Z",
  ),
  done(
    "mutation (native-design-system 9)",
    "2026-10-18T01:05:52Z",
    "2026-10-18T01:19:05Z",
  ),
  done(
    "mutation (view-logic 1)",
    "2026-10-18T01:05:52Z",
    "2026-10-18T01:06:57Z",
  ),
  done(
    "mutation (native-theme 6)",
    "2026-10-18T01:09:57Z",
    "2026-10-18T01:20:21Z",
  ),
  done("mutation (client 0)", "2026-10-18T01:07:54Z", "2026-10-18T01:09:21Z"),
  running("footprint", "2026-10-18T01:20:24Z"),
];

const quick = (quality: string): readonly Job[] => [
  done("changes", "2026-10-18T09:00:00Z", "2026-10-18T09:00:30Z"),
  done("quality", "2026-10-18T09:00:00Z", quality),
  done(MUTATION, "2026-10-18T09:00:30Z", "2026-10-18T09:00:30Z", "skipped"),
  done("performance", "2026-10-18T09:00:31Z", "2026-10-18T09:04:00Z"),
  done("measure", "2026-10-18T09:00:00Z", "2026-10-18T09:05:00Z"),
  done("secrets", "2026-10-18T09:00:00Z", "2026-10-18T09:00:07Z"),
  done("dependencies", "2026-10-18T09:00:00Z", "2026-10-18T09:00:20Z"),
  running("footprint", "2026-10-18T09:10:05Z"),
];

const pages = (...each: readonly (readonly Job[])[]) =>
  JSON.stringify(each.map((jobs) => ({ total_count: jobs.length, jobs })));

const RUNS: Readonly<Record<string, string>> = {
  "39087435994": pages(APP_CHANGE),
  "39085178042": pages(MUTATED.slice(0, 7), MUTATED.slice(7)),
  "android-still-walking": pages(
    APP_CHANGE.map((job) =>
      job.name === "android" ? running("android", "2026-10-18T01:46:59Z") : job,
    ),
  ),
  "measure-still-running": pages(
    APP_CHANGE.map((job) =>
      job.name === "measure" ? running("measure", "2026-10-18T01:46:42Z") : job,
    ),
  ),
  "ten-minutes": pages(quick("2026-10-18T09:10:00Z")),
  "a-second-over": pages(quick("2026-10-18T09:10:01Z")),
  "renamed-lint": pages([
    done("Lint the tree", "2026-10-18T09:00:00Z", "2026-10-18T09:01:05Z"),
    done("Lint the trees", "2026-10-18T09:00:00Z", "2026-10-18T09:03:00Z"),
    running("footprint", "2026-10-18T09:03:10Z"),
  ]),
  "never-started": pages([
    { ...done("quality", "", "2026-10-18T09:00:00Z"), started_at: null },
  ]),
  "a-tie": pages([
    done("changes", "2026-10-18T09:00:00Z", "2026-10-18T09:00:30Z"),
    done("quality", "2026-10-18T09:00:00Z", "2026-10-18T09:05:00Z"),
    done("mutation (core 0)", "2026-10-18T09:00:30Z", "2026-10-18T09:05:00Z"),
    done("performance", "2026-10-18T09:00:30Z", "2026-10-18T09:01:00Z"),
    done("measure", "2026-10-18T09:00:00Z", "2026-10-18T09:01:00Z"),
    done("secrets", "2026-10-18T09:00:00Z", "2026-10-18T09:00:07Z"),
    done("dependencies", "2026-10-18T09:00:00Z", "2026-10-18T09:00:20Z"),
  ]),
  "a-tie-in-a-matrix": pages([
    done("changes", "2026-10-18T09:00:00Z", "2026-10-18T09:00:30Z"),
    done("quality", "2026-10-18T09:00:00Z", "2026-10-18T09:01:00Z"),
    done("mutation (core 0)", "2026-10-18T09:00:30Z", "2026-10-18T09:07:10Z"),
    done("mutation (client 1)", "2026-10-18T09:01:00Z", "2026-10-18T09:07:40Z"),
    done("performance", "2026-10-18T09:00:30Z", "2026-10-18T09:01:00Z"),
    done("measure", "2026-10-18T09:00:00Z", "2026-10-18T09:01:00Z"),
    done("secrets", "2026-10-18T09:00:00Z", "2026-10-18T09:00:07Z"),
    done("dependencies", "2026-10-18T09:00:00Z", "2026-10-18T09:00:20Z"),
  ]),
  "no-pages": JSON.stringify({ message: "Not Found" }),
  "a-page-without-jobs": JSON.stringify([
    {
      total_count: 1,
      jobs: [done("quality", "2026-10-18T09:00:00Z", "2026-10-18T09:01:00Z")],
    },
    { total_count: 0 },
  ]),
  "a-job-without-a-name": JSON.stringify([
    { total_count: 3, jobs: [{}, null, { name: 42 }] },
  ]),
  "a-null-page": JSON.stringify([null]),
  "not-json": "<html>",
};

const ANSWERS: Readonly<Record<string, string>> = Object.fromEntries([
  ...Object.entries(WORKFLOWS).map(([path, jobs]) => [
    `yq --output-format=json .jobs ${path}`,
    JSON.stringify(jobs),
  ]),
  ...Object.entries(RUNS).map(([run, body]) => [
    `gh api --paginate --slurp repos/{owner}/{repo}/actions/runs/${run}/jobs?per_page=100`,
    body,
  ]),
]);

const answered = (command: string, args: readonly string[]): string => {
  const answer = ANSWERS[[command, ...args].join(" ")];
  if (answer === undefined)
    throw new Error(`${command} ${args.join(" ")}\ngh: Not Found (HTTP 404)`);
  return answer;
};

export const ran = (...argv: string[]): Ran => {
  const out: string[] = [];
  const err: string[] = [];
  const code = main(
    ["node", "gating-time", ...argv],
    answered,
    { write: (text) => out.push(text) },
    { write: (text) => err.push(text) },
  );
  return { code, out: out.join(""), err: err.join("") };
};

export const timed = (run: string, workflow = "ci.yml"): Ran =>
  ran("--workflow", workflow, "--run", run, "--job", "footprint");
