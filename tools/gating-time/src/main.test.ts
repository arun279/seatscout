import { describe, expect, it } from "vitest";
import { ran, timed } from "./main.fixtures.ts";

const GUIDELINE =
  "the ten-minute guideline for the build that gates a change, from [Martin Fowler's Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html#build-fast)";

const TIMED =
  "That is the longest chain of the jobs `footprint` waits on, each timed from when a runner started it, so time spent queued is not counted:";

const OVER =
  "Make a job in that chain faster, split it into jobs that run side by side, or move it to a later stage that the merge does not wait on.";

describe("the time a pull request waits for the jobs that gate its merge, held to Fowler's ten-minute guideline", () => {
  it("passes run 39087435994, whose longest chain was measure at 7 min 42 s, and says what it timed and what the run cost", () => {
    const report = timed("39087435994");

    expect(report.code).toBe(0);
    expect(report.err).toBe("");
    expect(report.out).toBe(
      [
        "### Gating time",
        "",
        `The jobs that gate this change took 7 min 42 s, within ${GUIDELINE}. ${TIMED} measure (7 min 42 s).`,
        "",
        "Runner time: 37 min 54 s over 7 jobs.",
        "",
      ].join("\n"),
    );
  });

  it("fails the same run when the merge also waits on the walk on the emulator, which took 18 min 56 s after changes", () => {
    const report = timed("39087435994", "android-gates.yml");

    expect(report.code).toBe(1);
    expect(report.out).toContain(
      `The jobs that gate this change took 19 min 25 s, over ${GUIDELINE}. ${TIMED} changes (29 s), then android (18 min 56 s). ${OVER}`,
    );
  });

  it("times a matrix by its slowest job, so run 39085178042 waited 13 min 47 s on changes and then mutation, and fails", () => {
    const report = timed("39085178042");

    expect(report.code).toBe(1);
    expect(report.out).toContain(
      "took 13 min 47 s, over the ten-minute guideline",
    );
    expect(report.out).toContain(
      "changes (34 s), then mutation (native-design-system 9) (13 min 13 s).",
    );
    expect(report.out).toContain("Runner time: 69 min 46 s over 12 jobs.");
  });

  it.each([
    ["ten-minutes", 0, "took 10 min, within"],
    ["a-second-over", 1, "took 10 min 1 s, over"],
  ])(
    "holds %s to the second, passing ten minutes and failing a second more",
    (run, code, said) => {
      const report = timed(run);

      expect(report.code).toBe(code);
      expect(report.out).toContain(said);
      expect(report.out).toContain(`${TIMED} quality (`);
    },
  );

  it("passes over a skipped job, which neither joins the chain nor counts as run", () => {
    const report = timed("ten-minutes");

    expect(report.out).not.toContain("mutation");
    expect(report.out).toContain("Runner time: 19 min 26 s over 6 jobs.");
  });

  it("leaves a skipped job out of the chain even when it is listed first", () => {
    const report = timed("ten-minutes", "skips-first.yml");

    expect(report.out).toContain(`${TIMED} changes (30 s).`);
  });

  it("finds a job by the whole name the workflow gives it rather than its id", () => {
    const report = timed("renamed-lint", "gates-a-renamed-job.yml");

    expect(report.code).toBe(0);
    expect(report.out).toContain(`${TIMED} Lint the tree (1 min 5 s).`);
  });

  it("reads a job the workflow declares with nothing under it", () => {
    const report = timed("ten-minutes", "a-bare-job.yml");

    expect(report.code).toBe(0);
    expect(report.out).toContain(`${TIMED} quality (10 min).`);
  });

  it("names the first of two chains that took equally long, in the order the workflow lists them", () => {
    expect(timed("a-tie").out).toContain(`${TIMED} quality (5 min).`);
  });

  it("names the first of two jobs in a matrix that took equally long", () => {
    expect(timed("a-tie-in-a-matrix").out).toContain(
      `${TIMED} changes (30 s), then mutation (core 0) (6 min 40 s).`,
    );
  });

  it("leaves out of the runner time a later stage still running, and names it", () => {
    const report = timed("android-still-walking");

    expect(report.code).toBe(0);
    expect(report.out).toContain(
      "Runner time: 18 min 58 s over 6 jobs. Still running, so not counted: android.",
    );
  });
});

describe("a gating time it cannot measure fails the change, never passes it", () => {
  it.each([
    [
      "39087435994",
      "gates-a-job-the-run-lacks.yml",
      "smoke, which `footprint` waits on, ran as no job in run 39087435994.",
    ],
    [
      "measure-still-running",
      "ci.yml",
      "measure has not run to its end, so how long the change waited on it is not known.",
    ],
    [
      "never-started",
      "gates-quality.yml",
      "quality has not run to its end, so how long the change waited on it is not known.",
    ],
    [
      "39087435994",
      "waits-on-nothing.yml",
      "`footprint` waits on no job, so there is no gate to time.",
    ],
    [
      "39087435994",
      "no-jobs.yml",
      "The workflow declares no job called `footprint`.",
    ],
    [
      "39087435994",
      "needs-a-ghost.yml",
      "The workflow declares no job called `ghost`.",
    ],
    [
      "no-pages",
      "ci.yml",
      "GitHub answered run no-pages with something other than pages of jobs.",
    ],
    [
      "a-page-without-jobs",
      "ci.yml",
      "GitHub answered run a-page-without-jobs with something other than pages of jobs.",
    ],
    [
      "a-null-page",
      "ci.yml",
      "GitHub answered run a-null-page with something other than pages of jobs.",
    ],
    [
      "a-job-without-a-name",
      "ci.yml",
      "changes, which `footprint` waits on, ran as no job in run a-job-without-a-name.",
    ],
  ])("refuses run %s timed by %s", (run, workflow, reason) => {
    const report = timed(run, workflow);

    expect(report.code).toBe(1);
    expect(report.out).toBe(
      `### Gating time\n\nNot measured, so this change is refused: ${reason}\n`,
    );
  });

  it("refuses a run whose jobs GitHub would not hand over, quoting what gh said", () => {
    const report = timed("39999999999");

    expect(report.code).toBe(1);
    expect(report.out).toContain(
      "Not measured, so this change is refused: gh api --paginate --slurp repos/{owner}/{repo}/actions/runs/39999999999/jobs?per_page=100\ngh: Not Found (HTTP 404)\n",
    );
  });

  it("refuses an answer that is not JSON", () => {
    const report = timed("not-json");

    expect(report.code).toBe(1);
    expect(report.out).toContain("Not measured, so this change is refused: ");
  });

  it("refuses a workflow it could not read", () => {
    const report = timed("39087435994", "missing.yml");

    expect(report.code).toBe(1);
    expect(report.out).toContain(
      "refused: yq --output-format=json .jobs missing.yml\n",
    );
  });

  it.each([
    [["--workflow", "ci.yml", "--run", "39087435994"]],
    [["--workflow", "ci.yml", "--job", "footprint"]],
    [["--run", "39087435994", "--job", "footprint"]],
    [["--workflow", "ci.yml", "--run", "39087435994", "--job"]],
  ])("prints its usage and reads nothing when told %j", (argv) => {
    const report = ran(...argv);

    expect(report.code).toBe(2);
    expect(report.out).toBe("");
    expect(report.err).toBe(
      "usage: gating-time --workflow <workflow file> --run <run id> --job <the job that measures>\n",
    );
  });
});
