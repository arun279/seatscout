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

const RENDERED = `### Code footprint

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
| Prose code | 200 | 0 | 0 |
| Prose comments | 0 | 0 | 0 |
| Data code | 40 | 0 | 0 |
| Data comments | 0 | 0 | 0 |

### Comment load

| Source | Code | Comments | Prose |
| --- | ---: | ---: | ---: |
| Merge base | 170 | 2 | 1000 |
| This branch | 220 | 2 | 1200 |

Comments may not exceed the ratchet in \`.footprint.json\`, which is 2. Within it.

Prose is reported and not gated. Explanation that leaves a comment and lands in
markdown keeps the comment count flat, so the two are read together.

### What was counted

| Files | Merge base | This branch |
| --- | ---: | ---: |
| Product | 1 | 1 |
| Test | 1 | 1 |
| Tooling | 1 | 1 |
| Prose | 1 | 1 |
| Data | 0 | 0 |

Every file on both sides is sorted into one of these, and every bucket the merge base
held still holds a file. Holds.

### Bundle size

Brotli, summed per file, over every script an application's own bundler
emits, with the workspace packages it reaches inlined. Every emitted chunk
counts, including one no page has loaded, so this is what a build publishes
rather than what a page weighs.

| Bundle | Brotli | Ratchet |
| --- | ---: | ---: |
| web app | 15 B | 15 B |

Bundle size may not exceed the ratchet in \`.size-limit.json\`. Within it.
`;

const SOME_SOURCE: Tree = {
  "packages/core/src/seat.ts": counts(40, 0),
  "packages/core/src/seat.test.ts": counts(20, 0),
  "tools/footprint/src/report.ts": counts(30, 0),
};

const side = (ref: string, over: Partial<Side> = {}): Side => ({
  ref,
  tree: SOME_SOURCE,
  ...over,
});

const reportOn = (over: Partial<Measurement>) =>
  render({
    base: side("0123456789abcdef0123456789abcdef01234567"),
    head: side("fedcba9876543210fedcba9876543210fedcba98"),
    diff: { added: {}, removed: {}, modified: {} },
    bundles: [{ name: "web app", size: 15, sizeLimit: 15, passed: true }],
    commentRatchet: 0,
    ...over,
  });

const between = (base: Tree, head: Tree, commentRatchet = 0) =>
  reportOn({
    base: side("b", { tree: base }),
    head: side("h", { tree: head }),
    commentRatchet,
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

describe("the comment ratchet", () => {
  it("passes a tree whose comments sit at the ratchet", () => {
    const report = between(
      SOME_SOURCE,
      { ...SOME_SOURCE, "packages/core/src/seat.ts": counts(40, 2) },
      2,
    );

    expect(report.passed).toBe(true);
    expect(report.markdown).toContain(
      "Comments may not exceed the ratchet in `.footprint.json`, which is 2. Within it.",
    );
  });

  it("fails a tree one comment above the ratchet", () => {
    expect(
      between(
        SOME_SOURCE,
        { ...SOME_SOURCE, "packages/core/src/seat.ts": counts(40, 1) },
        0,
      ).passed,
    ).toBe(false);
  });

  it("refuses comments that grow with the code, which a density would have allowed", () => {
    const report = between(
      { "packages/core/src/seat.ts": counts(100, 1) },
      { "packages/core/src/seat.ts": counts(1000, 10) },
      1,
    );

    expect(report.passed).toBe(false);
    expect(report.markdown).toContain("| This branch | 1000 | 10 | 0 |");
  });

  it("holds build tooling to the same ratchet as the product", () => {
    expect(
      between(SOME_SOURCE, {
        ...SOME_SOURCE,
        "tools/footprint/src/report.ts": counts(100, 1),
      }).passed,
    ).toBe(false);
  });

  it("ignores comments outside source files, so pinning an action stays free", () => {
    expect(
      between(SOME_SOURCE, {
        ...SOME_SOURCE,
        ".github/workflows/ci.yml": counts(30, 5),
      }).passed,
    ).toBe(true);
  });

  it("names both ways through when the comment ratchet is broken", () => {
    expect(
      between(SOME_SOURCE, {
        ...SOME_SOURCE,
        "packages/core/src/seat.ts": counts(40, 1),
      }).markdown,
    ).toContain(
      "Above it. Either make the code say what the comment would have said, or raise the ratchet in this diff, where a reviewer sees it.",
    );
  });
});

describe("what was counted", () => {
  it("reports how many files each bucket holds on each side", () => {
    const { markdown } = between(SOME_SOURCE, {
      ...SOME_SOURCE,
      "CONTRIBUTING.md": counts(10, 0),
      "pnpm-lock.yaml": counts(900, 0),
    });

    expect(markdown).toContain("| Product | 1 | 1 |");
    expect(markdown).toContain("| Test | 1 | 1 |");
    expect(markdown).toContain("| Tooling | 1 | 1 |");
    expect(markdown).toContain("| Prose | 0 | 1 |");
    expect(markdown).toContain("| Data | 0 | 1 |");
  });

  it("holds when every bucket the merge base held still holds a file", () => {
    const report = between(SOME_SOURCE, SOME_SOURCE);

    expect(report.passed).toBe(true);
    expect(report.markdown).toContain(
      "Every file on both sides is sorted into one of these, and every bucket the merge base\nheld still holds a file. Holds.",
    );
  });

  it("fails when a bucket the merge base held has emptied, and names it", () => {
    const report = between(SOME_SOURCE, {
      "packages/core/src/seat.ts": counts(40, 0),
      "packages/core/src/seat.test.ts": counts(20, 0),
    });

    expect(report.passed).toBe(false);
    expect(report.markdown).toContain(
      "Tooling held files at the merge base and holds none here. A file leaves the measurement when its path stops matching how this report sorts it. Either put it back, or sort it in tools/footprint/src/report.ts, where a reviewer sees which side of the count it landed on.",
    );
  });

  it("names every bucket that emptied, not only the first", () => {
    expect(
      between(SOME_SOURCE, { "packages/core/src/seat.ts": counts(40, 0) })
        .markdown,
    ).toContain("Test, Tooling held files at the merge base");
  });

  it("fails on a file it sorts nowhere, rather than leaving its lines in no column", () => {
    const report = between(SOME_SOURCE, {
      ...SOME_SOURCE,
      "apps/web/src/view.svelte": counts(40, 0),
    });

    expect(report.passed).toBe(false);
    expect(report.markdown).toContain(
      "1 file(s) match nothing this report sorts by, so their lines are in no column: apps/web/src/view.svelte.",
    );
  });

  it("names an unsorted file on the merge base side too", () => {
    expect(
      between({ ...SOME_SOURCE, "old.svelte": counts(1, 0) }, SOME_SOURCE)
        .passed,
    ).toBe(false);
  });

  it("fails when nothing authored is counted at all", () => {
    const report = between(SOME_SOURCE, { "README.md": counts(40, 0) });

    expect(report.passed).toBe(false);
    expect(report.markdown).toContain(
      "Nothing under product, test, tooling was counted at all, so there is no measurement to report.",
    );
  });

  it("fails a head holding nothing at all rather than passing over it", () => {
    expect(between(SOME_SOURCE, {}).passed).toBe(false);
  });

  it("does not mind a bucket that was empty at the merge base staying empty", () => {
    const tree = {
      "packages/core/src/seat.ts": counts(40, 0),
      "packages/core/src/seat.test.ts": counts(20, 0),
      "tools/footprint/src/report.ts": counts(30, 0),
    };

    expect(between(tree, tree).passed).toBe(true);
  });
});

describe("the bundle ratchet", () => {
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

describe("one measurement, always the same bytes", () => {
  it("renders exactly this", () => {
    const { markdown } = render({
      base: {
        ref: "0123456789abcdef0123456789abcdef01234567",
        tree: {
          "packages/core/src/seat.ts": counts(100, 2),
          "packages/core/src/seat.test.ts": counts(30, 0),
          "tools/footprint/src/report.ts": counts(40, 0),
          "CONTRIBUTING.md": counts(1000, 0),
        },
      },
      head: {
        ref: "fedcba9876543210fedcba9876543210fedcba98",
        tree: {
          "packages/core/src/seat.ts": counts(120, 2),
          "packages/core/src/seat.test.ts": counts(60, 0),
          "tools/footprint/src/report.ts": counts(40, 0),
          "CONTRIBUTING.md": counts(1200, 0),
        },
      },
      diff: {
        added: {
          "packages/core/src/seat.ts": counts(20, 0),
          "packages/core/src/seat.test.ts": counts(30, 0),
          "CONTRIBUTING.md": counts(200, 0),
          "pnpm-lock.yaml": counts(40, 0),
        },
        removed: { "packages/core/src/label.ts": counts(5, 1) },
        modified: { "vitest.config.ts": counts(2, 0) },
      },
      bundles: [{ name: "web app", size: 15, sizeLimit: 15, passed: true }],
      commentRatchet: 2,
    });

    expect(markdown).toBe(RENDERED);
  });
});
