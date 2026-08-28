import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  type Counts,
  filesOf,
  type Measurement,
  render,
  type Tree,
} from "./report.js";

const counts = (code: number, comment: number): Counts => ({ code, comment });

const reportOn = (over: Partial<Measurement>) =>
  render({
    base: "0123456789abcdef0123456789abcdef01234567",
    head: "fedcba9876543210fedcba9876543210fedcba98",
    baseTree: {},
    headTree: {},
    diff: { added: {}, removed: {}, modified: {} },
    bundles: [{ name: "web app", size: 15, sizeLimit: 15, passed: true }],
    ...over,
  });

describe("the footprint report", () => {
  it("splits changed lines by product, test and tooling code, and by comments", () => {
    const { markdown } = reportOn({
      diff: {
        added: {
          "packages/core/src/seat.ts": counts(40, 3),
          "packages/core/src/seat.test.ts": counts(25, 1),
          "tools/footprint/src/report.ts": counts(18, 0),
          "biome.json": counts(6, 0),
        },
        removed: { "packages/core/src/label.ts": counts(9, 0) },
        modified: { "packages/core/src/seat.ts": counts(4, 2) },
      },
    });

    expect(markdown).toContain("| Product code | 40 | 9 | 4 |");
    expect(markdown).toContain("| Product comments | 3 | 0 | 2 |");
    expect(markdown).toContain("| Test code | 25 | 0 | 0 |");
    expect(markdown).toContain("| Test comments | 1 | 0 | 0 |");
    expect(markdown).toContain("| Tooling code | 18 | 0 | 0 |");
    expect(markdown).toContain("| Tooling comments | 0 | 0 | 0 |");
    expect(markdown).toContain("| Other code | 6 | 0 | 0 |");
    expect(markdown).toContain("| Other comments | 0 | 0 | 0 |");
  });

  it("leaves generated and configuration lines out of the authored total", () => {
    const { markdown } = reportOn({
      diff: {
        added: {
          "packages/core/src/seat.ts": counts(40, 3),
          "pnpm-lock.yaml": counts(900, 0),
        },
        removed: {},
        modified: {},
      },
    });

    expect(markdown).toContain("| Authored total | 43 | 0 | 0 |");
    expect(markdown).toContain("| Other code | 900 | 0 | 0 |");
  });

  it("names the two commits it was measured between", () => {
    expect(reportOn({}).markdown).toContain("`0123456` to `fedcba9`");
  });

  it("reads zero comment load from a tree with no source at all", () => {
    expect(reportOn({}).markdown).toContain("| Merge base | 0 | 0 | 0.00 |");
  });

  it("counts a directory of tests as test code", () => {
    const { markdown } = reportOn({
      diff: {
        added: { "apps/web/tests/e2e/search.spec.ts": counts(30, 0) },
        removed: {},
        modified: {},
      },
    });

    expect(markdown).toContain("| Test code | 30 | 0 | 0 |");
    expect(markdown).toContain("| Product code | 0 | 0 | 0 |");
  });

  it("reads the same however the counter orders its output", () => {
    const entries: [string, Counts][] = [
      ["packages/core/src/seat.ts", counts(40, 3)],
      ["packages/core/src/seat.test.ts", counts(25, 1)],
      ["apps/web/tsconfig.json", counts(6, 0)],
      ["README.md", counts(12, 0)],
    ];
    const shuffled = fc.shuffledSubarray(entries, {
      minLength: entries.length,
    });
    const markdownFor = (tree: Tree) =>
      reportOn({
        headTree: tree,
        diff: { added: tree, removed: {}, modified: {} },
      }).markdown;

    fc.assert(
      fc.property(shuffled, shuffled, (one, other) => {
        expect(markdownFor(Object.fromEntries(one))).toBe(
          markdownFor(Object.fromEntries(other)),
        );
      }),
    );
  });

  it("fails when comments grow faster than the code they explain", () => {
    const report = reportOn({
      baseTree: { "packages/core/src/seat.ts": counts(100, 1) },
      headTree: { "packages/core/src/seat.ts": counts(100, 2) },
    });

    expect(report.passed).toBe(false);
    expect(report.markdown).toContain(
      "Comment load may not exceed the merge base. Above it.",
    );
  });

  it("allows comments that keep pace with the code", () => {
    const report = reportOn({
      baseTree: { "packages/core/src/seat.ts": counts(100, 1) },
      headTree: { "packages/core/src/seat.ts": counts(200, 2) },
    });

    expect(report.passed).toBe(true);
    expect(report.markdown).toContain("| This branch | 200 | 2 | 1.00 |");
  });

  it("holds build tooling to the same comment load as the product", () => {
    const report = reportOn({
      baseTree: { "tools/footprint/src/report.ts": counts(100, 0) },
      headTree: { "tools/footprint/src/report.ts": counts(100, 1) },
    });

    expect(report.passed).toBe(false);
  });

  it("ignores comments outside source files, so pinning an action stays free", () => {
    const report = reportOn({
      baseTree: { "packages/core/src/seat.ts": counts(100, 0) },
      headTree: {
        "packages/core/src/seat.ts": counts(100, 0),
        ".github/workflows/ci.yml": counts(30, 5),
      },
    });

    expect(report.passed).toBe(true);
  });

  it("fails when a bundle breaks its ratchet", () => {
    const report = reportOn({
      bundles: [
        { name: "web app", size: 2048, sizeLimit: 1024, passed: false },
      ],
    });

    expect(report.passed).toBe(false);
    expect(report.markdown).toContain(
      "| web app | 2048 B | 1024 B | -1024 B |",
    );
  });
});

describe("reading a counter report", () => {
  it("keeps the files and drops the counter's own totals", () => {
    expect(
      filesOf({
        header: { cloc_version: "2.10", n_files: 1, n_lines: 40 },
        "packages/core/src/seat.ts": counts(40, 0),
        SUM: counts(40, 0),
      }),
    ).toStrictEqual({ "packages/core/src/seat.ts": counts(40, 0) });
  });
});
