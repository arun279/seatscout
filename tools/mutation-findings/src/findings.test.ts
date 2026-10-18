import { describe, expect, it } from "vitest";
import { findings } from "./findings.ts";

const RUN = "https://github.com/owner/repo/actions/runs/1";
const COMPARED = 'export const up = (s) => s === "light";\n';
const BLOCK = "const a = () => {\n  return 1;\n};\n";

const at = (
  start: readonly [number, number],
  end: readonly [number, number],
) => ({
  start: { line: start[0], column: start[1] },
  end: { line: end[0], column: end[1] },
});

const report = (
  files: Readonly<
    Record<string, { source: string; mutants: readonly object[] }>
  >,
) => JSON.stringify({ schemaVersion: "2.0", files });

const compared = (status: string) =>
  report({
    "packages/core/src/up.ts": {
      source: COMPARED,
      mutants: [
        {
          id: "0",
          mutatorName: "EqualityOperator",
          replacement: 's !== "light"',
          status,
          location: at([1, 26], [1, 39]),
        },
      ],
    },
  });

const block = report({
  "apps/native/src/a.ts": {
    source: BLOCK,
    mutants: [
      {
        id: "0",
        mutatorName: "BlockStatement",
        replacement: "{}",
        status: "NoCoverage",
        location: at([1, 17], [3, 2]),
      },
      {
        id: "1",
        mutatorName: "ArrowFunction",
        replacement: "() => undefined",
        status: "Ignored",
        location: at([1, 11], [3, 2]),
      },
    ],
  },
});

const judged = (outcome: string, report: string) => ({
  shard: "core",
  outcome,
  report,
});

describe("the mutation findings", () => {
  it("writes the issue as what was done and how to answer it, the count, then each survivor, a blank line apart", () => {
    const survived = report({
      "packages/core/src/up.ts": {
        source:
          'const light = "light";\nexport const up = (s) => s === light;\n',
        mutants: [
          {
            id: "0",
            mutatorName: "EqualityOperator",
            replacement: "s !== light",
            status: "Survived",
            location: at([2, 26], [2, 37]),
          },
        ],
      },
    });

    expect(findings([judged("success", survived)], RUN)).toEqual({
      found: true,
      body: [
        "Stryker changed one place on each line this merge added or edited, as Google's code review does, and ran the tests that reach it. Fix each finding in the next pull request, before new feature work: add the test that kills the mutant, or say on this issue why it is not useful.",
        "",
        "**1 of 1 mutants survived.**",
        "",
        "### `packages/core/src/up.ts:2` EqualityOperator survived",
        "",
        "```diff",
        "- export const up = (s) => s === light;",
        "+ export const up = (s) => s !== light;",
        "```",
      ].join("\n"),
    });
  });

  it("names a survivor by file and line, with the line before and after Stryker changed it", () => {
    const { found, body } = findings(
      [judged("success", compared("Survived"))],
      RUN,
    );

    expect(found).toBe(true);
    expect(body).toContain("**1 of 1 mutants survived.**");
    expect(body).toContain(
      [
        "### `packages/core/src/up.ts:1` EqualityOperator survived",
        "",
        "```diff",
        '- export const up = (s) => s === "light";',
        '+ export const up = (s) => s !== "light";',
        "```",
      ].join("\n"),
    );
  });

  it("shows every line of a mutant that spans several, and says when no test reached it", () => {
    const { found, body } = findings([judged("success", block)], RUN);

    expect(found).toBe(true);
    expect(body).toContain(
      [
        "### `apps/native/src/a.ts:1` BlockStatement reached by no test",
        "",
        "```diff",
        "- const a = () => {",
        "-   return 1;",
        "- };",
        "+ const a = () => {};",
        "```",
      ].join("\n"),
    );
  });

  it("counts the mutants judged across every job, and leaves out the ones Stryker ignored", () => {
    const { body } = findings(
      [
        judged("success", compared("Killed")),
        judged("success", block),
        judged("success", compared("Timeout")),
      ],
      RUN,
    );

    expect(body).toContain("**1 of 3 mutants survived.**");
  });

  it("finds nothing when every mutant was killed, and says how many were", () => {
    const { found, body } = findings(
      [judged("success", compared("Killed"))],
      RUN,
    );

    expect(found).toBe(false);
    expect(body).toBe("The tests killed all 1 mutants on this merge's lines.");
  });

  it("reports a job that broke, naming it and linking the run, beside what the other jobs found", () => {
    const { found, body } = findings(
      [
        judged("success", compared("Killed")),
        { shard: "native-ask", outcome: "failure", report: null },
        { shard: "native-shell", outcome: undefined, report: null },
        { shard: "native-search", outcome: "success", report: null },
      ],
      RUN,
    );

    expect(found).toBe(true);
    expect(body).toContain(
      `The native-search job left no report, so the lines it was given were not judged. [The run](${RUN}) says why.`,
    );
    expect(body).toContain(
      `The native-ask job broke, so the lines it was given were not judged. [The run](${RUN}) says why.`,
    );
    expect(body).toContain(
      `The native-shell job left no result, so the lines it was given were not judged. [The run](${RUN}) says why.`,
    );
    expect(body).toContain("No mutant survived of the 1 judged.");
  });

  it("reports a plan that could not be made", () => {
    expect(findings(undefined, RUN)).toEqual({
      found: true,
      body: `The plan of what to mutate could not be made, so nothing was judged. [The run](${RUN}) says why.`,
    });
  });

  it("finds nothing in a merge that holds no line to mutate", () => {
    expect(findings([], RUN)).toEqual({
      found: false,
      body: "This merge adds or edits no line Stryker can mutate.",
    });
  });
});
