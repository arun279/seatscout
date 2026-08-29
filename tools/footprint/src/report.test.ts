import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  type Counts,
  filesOf,
  type Measurement,
  render,
  type Side,
  type Tree,
} from "./report.js";

const counts = (code: number, comment: number): Counts => ({ code, comment });

const side = (ref: string, over: Partial<Side> = {}): Side => ({
  ref,
  tree: {},
  ...over,
});

const reportOn = (over: Partial<Measurement>) =>
  render({
    base: side("0123456789abcdef0123456789abcdef01234567"),
    head: side("fedcba9876543210fedcba9876543210fedcba98"),
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
        head: side("h", { tree }),
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

  it("renders exactly this, so one measurement is always the same bytes", () => {
    const { markdown } = reportOn({
      base: side("0123456789abcdef0123456789abcdef01234567", {
        tree: { "packages/core/src/seat.ts": counts(100, 2) },
      }),
      head: side("fedcba9876543210fedcba9876543210fedcba98", {
        tree: {
          "packages/core/src/seat.ts": counts(120, 2),
          "packages/core/src/seat.test.ts": counts(30, 0),
        },
      }),
      diff: {
        added: {
          "packages/core/src/seat.ts": counts(20, 0),
          "packages/core/src/seat.test.ts": counts(30, 0),
          "pnpm-lock.yaml": counts(40, 0),
        },
        removed: { "packages/core/src/label.ts": counts(5, 1) },
        modified: { "vitest.config.ts": counts(2, 0) },
      },
    });

    expect(markdown).toBe(`### Code footprint

\`0123456\` to \`fedcba9\`, blank lines excluded.

| Lines | Added | Removed | Changed |
| --- | ---: | ---: | ---: |
| Product code | 20 | 5 | 0 |
| Product comments | 0 | 1 | 0 |
| Test code | 30 | 0 | 0 |
| Test comments | 0 | 0 | 0 |
| Tooling code | 0 | 0 | 2 |
| Tooling comments | 0 | 0 | 0 |
| Authored total | 50 | 6 | 2 |
| Other code | 40 | 0 | 0 |
| Other comments | 0 | 0 | 0 |

### Comment load

| Source | Code | Comments | Per 100 lines |
| --- | ---: | ---: | ---: |
| Merge base | 100 | 2 | 2.00 |
| This branch | 150 | 2 | 1.33 |

Comment load may not exceed the merge base. Within it.

### Bundle size

Brotli, summed per file, over every script an application's own bundler
emits, with the workspace packages it reaches inlined. Every emitted chunk
counts, including one no page has loaded, so this is what a build publishes
rather than what a page weighs.

| Bundle | Brotli | Ratchet |
| --- | ---: | ---: |
| web app | 15 B | 15 B |

Bundle size may not exceed the ratchet in \`.size-limit.json\`. Within it.
`);
  });

  it("counts every extension the workspace can hold as source", () => {
    const { markdown } = reportOn({
      diff: {
        added: {
          "packages/core/src/seat.mts": counts(7, 0),
          "packages/core/src/label.cts": counts(3, 0),
          "apps/web/src/view.tsx": counts(5, 0),
        },
        removed: {},
        modified: {},
      },
    });

    expect(markdown).toContain("| Product code | 15 | 0 | 0 |");
  });

  it("counts a top level tests directory as tests without a suffix to go on", () => {
    const { markdown } = reportOn({
      diff: {
        added: { "tests/e2e/helpers.ts": counts(9, 0) },
        removed: {},
        modified: {},
      },
    });

    expect(markdown).toContain("| Test code | 9 | 0 | 0 |");
  });

  it("counts a singular test directory as tests as well", () => {
    const { markdown } = reportOn({
      diff: {
        added: { "packages/core/test/helpers.ts": counts(4, 0) },
        removed: {},
        modified: {},
      },
    });

    expect(markdown).toContain("| Test code | 4 | 0 | 0 |");
  });

  it("decides product from the top of the path, not a directory further down", () => {
    const { markdown } = reportOn({
      diff: {
        added: { "tools/footprint/src/packages/registry.ts": counts(6, 0) },
        removed: {},
        modified: {},
      },
    });

    expect(markdown).toContain("| Tooling code | 6 | 0 | 0 |");
    expect(markdown).toContain("| Product code | 0 | 0 | 0 |");
  });

  it("keeps a file with no source extension out of the authored total", () => {
    const { markdown } = reportOn({
      diff: {
        added: { "docs/adr/0006-gates.md": counts(50, 0) },
        removed: {},
        modified: {},
      },
    });

    expect(markdown).toContain("| Other code | 50 | 0 | 0 |");
    expect(markdown).toContain("| Authored total | 0 | 0 | 0 |");
  });

  it("fails when comments grow faster than the code they explain", () => {
    const report = reportOn({
      base: side("b", {
        tree: { "packages/core/src/seat.ts": counts(100, 1) },
      }),
      head: side("h", {
        tree: { "packages/core/src/seat.ts": counts(100, 2) },
      }),
    });

    expect(report.passed).toBe(false);
    expect(report.markdown).toContain(
      "Comment load may not exceed the merge base. Above it.",
    );
  });

  it("allows comments that keep pace with the code", () => {
    const report = reportOn({
      base: side("b", {
        tree: { "packages/core/src/seat.ts": counts(100, 1) },
      }),
      head: side("h", {
        tree: { "packages/core/src/seat.ts": counts(200, 2) },
      }),
    });

    expect(report.passed).toBe(true);
    expect(report.markdown).toContain("| This branch | 200 | 2 | 1.00 |");
  });

  it("holds build tooling to the same comment load as the product", () => {
    const report = reportOn({
      base: side("b", {
        tree: { "tools/footprint/src/report.ts": counts(100, 0) },
      }),
      head: side("h", {
        tree: { "tools/footprint/src/report.ts": counts(100, 1) },
      }),
    });

    expect(report.passed).toBe(false);
  });

  it("ignores comments outside source files, so pinning an action stays free", () => {
    const report = reportOn({
      base: side("b", {
        tree: { "packages/core/src/seat.ts": counts(100, 0) },
      }),
      head: side("h", {
        tree: {
          "packages/core/src/seat.ts": counts(100, 0),
          ".github/workflows/ci.yml": counts(30, 5),
        },
      }),
    });

    expect(report.passed).toBe(true);
  });

  it("names both ways through when comment load fails", () => {
    const { markdown } = reportOn({
      base: side("b", {
        tree: { "packages/core/src/seat.ts": counts(100, 0) },
      }),
      head: side("h", {
        tree: { "packages/core/src/seat.ts": counts(100, 1) },
      }),
    });

    expect(markdown).toContain(
      "Above it. Either make the code say what the comment would have said, or raise the baseline by a reviewed change to ADR 6.",
    );
  });

  it("names both ways through when a bundle breaks its ratchet", () => {
    const { markdown } = reportOn({
      bundles: [
        { name: "web app", size: 2048, sizeLimit: 1024, passed: false },
      ],
    });

    expect(markdown).toContain(
      "Above it. Either make the bundle smaller, or raise the ratchet in this diff, where a reviewer sees it.",
    );
  });

  it("fails when any one bundle breaks its ratchet, not only when all do", () => {
    const report = reportOn({
      bundles: [
        { name: "web app", size: 15, sizeLimit: 15, passed: true },
        { name: "proxy", size: 90, sizeLimit: 15, passed: false },
      ],
    });

    expect(report.passed).toBe(false);
  });

  it("fails over no bundle at all, rather than reaching a verdict about nothing", () => {
    expect(reportOn({ bundles: [] }).passed).toBe(false);
  });

  it("fails when a bundle breaks its ratchet", () => {
    const report = reportOn({
      bundles: [
        { name: "web app", size: 2048, sizeLimit: 1024, passed: false },
      ],
    });

    expect(report.passed).toBe(false);
    expect(report.markdown).toContain("| web app | 2048 B | 1024 B |");
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
