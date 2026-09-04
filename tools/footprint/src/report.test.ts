import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  between,
  counts,
  reportOn,
  SOME_SOURCE,
  side,
} from "./report.fixtures.js";
import { type Counts, filesOf, type Tree } from "./volume.js";

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
    expect(markdown).toContain("| Data code | 6 | 0 | 0 |");
    expect(markdown).toContain("| Data comments | 0 | 0 | 0 |");
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
    expect(markdown).toContain("| Data code | 900 | 0 | 0 |");
  });

  it("names the two commits it was measured between", () => {
    expect(reportOn({}).markdown).toContain("`0123456` to `fedcba9`");
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

  it("counts a test fixture module as test code, wherever it sits", () => {
    const { markdown } = reportOn({
      diff: {
        added: {
          "packages/core/src/source/catalogue.fixtures.ts": counts(40, 0),
        },
        removed: {},
        modified: {},
      },
    });

    expect(markdown).toContain("| Test code | 40 | 0 | 0 |");
    expect(markdown).toContain("| Product code | 0 | 0 | 0 |");
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

  it("keeps configuration and data out of the authored total", () => {
    const { markdown } = reportOn({
      diff: {
        added: {
          "apps/proxy/wrangler.json": counts(50, 0),
          "deploy/setup.sh": counts(20, 0),
          "apps/web/index.html": counts(10, 0),
          "renovate.toml": counts(4, 0),
          "apps/web/site.webmanifest": counts(3, 0),
          "tools/x/planted/a.ts.txt": counts(2, 0),
          "lefthook.yml": counts(6, 0),
          "pnpm-workspace.yaml": counts(5, 0),
        },
        removed: {},
        modified: {},
      },
    });

    expect(markdown).toContain("| Data code | 100 | 0 | 0 |");
    expect(markdown).toContain("| Authored total | 0 | 0 | 0 |");
  });

  it("reads the same however the counter orders its output", () => {
    const entries: [string, Counts][] = [
      ["packages/core/src/seat.ts", counts(40, 3)],
      ["packages/core/src/seat.test.ts", counts(25, 1)],
      ["tools/footprint/src/report.ts", counts(9, 0)],
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
});

describe("prose", () => {
  it("counts a source whose name only holds the prose suffix as source", () => {
    const { markdown } = reportOn({
      diff: {
        added: { "packages/core/src/readme.md.ts": counts(12, 0) },
        removed: {},
        modified: {},
      },
    });

    expect(markdown).toContain("| Product code | 12 | 0 | 0 |");
    expect(markdown).toContain("| Prose code | 0 | 0 | 0 |");
  });

  it("counts markdown as prose rather than as something uncounted", () => {
    const { markdown } = reportOn({
      diff: {
        added: {
          "CONTRIBUTING.md": counts(1775, 0),
          "docs/adr/0006-gates.mdx": counts(50, 0),
        },
        removed: {},
        modified: {},
      },
    });

    expect(markdown).toContain("| Prose code | 1825 | 0 | 0 |");
    expect(markdown).toContain("| Data code | 0 | 0 | 0 |");
    expect(markdown).toContain("| Authored total | 0 | 0 | 0 |");
  });

  it("reports how much prose each side carries, beside the comments", () => {
    const { markdown } = between(
      { ...SOME_SOURCE, "CONTRIBUTING.md": counts(1000, 0) },
      { ...SOME_SOURCE, "CONTRIBUTING.md": counts(1775, 0) },
    );

    expect(markdown).toContain("| Merge base | 90 | 0 | 1000 |");
    expect(markdown).toContain("| This branch | 90 | 0 | 1775 |");
  });

  it("reports prose without gating it, so growing it alone still passes", () => {
    expect(
      between(
        { ...SOME_SOURCE, "CONTRIBUTING.md": counts(10, 0) },
        { ...SOME_SOURCE, "CONTRIBUTING.md": counts(9000, 0) },
      ).passed,
    ).toBe(true);
  });

  it("says why prose is reported beside the comment count", () => {
    expect(reportOn({}).markdown).toContain(
      "Prose is reported and not gated. Explanation that leaves a comment and lands in\nmarkdown keeps the comment count flat, so the two are read together.",
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
