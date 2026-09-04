import { describe, expect, it } from "vitest";
import { counts, GATES, LIMITS, SUITES, WEIGHED } from "./report.fixtures.js";
import { render } from "./report.js";

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

### Complexity and file length

Each limit here already fails the build when a function or a file passes it. The figure
is the highest the tree reaches under that limit, taken by running the same rule at a
threshold of one and reading its machine output. The gating passes are untouched, and
the limits below are read from the files that configure them rather than restated.

| Measure | Highest | Where | Limit |
| --- | ---: | --- | ---: |
| Cyclomatic complexity, per function | 9 | \`packages/core/src/source/read.ts:41\` \`read\` | 10 |
| Cognitive complexity, per function | 14 | \`tools/corpus-rows.mjs:39\` | 15 |
| Lines per file | 297 | \`packages/core/src/domain/map.test.ts\` | 300 |

9 file(s) sit within 10% of the 300 line limit, at 270 lines or more.
Nothing in this section gates, because each of these limits is gated where it is
measured. The count is what a decision to raise the line limit is made on: ADR 6 raises
that limit on cost sustained across many files, never to make one file fit.

### Tests

Collected rather than run, by each runner's own listing, so the figure is what the
suites hold rather than what one run happened to reach.

| Suite | Tests |
| --- | ---: |
| Unit, by Vitest | 487 |
| End to end, by Playwright | 7 |
| Total | 494 |

The total may not fall below the ratchet in \`.footprint.json\`, which is 494. At or above it.

A count is a weak gate on its own. It notices a suite shrinking and says nothing about
whether what is left asserts anything, so it is met by a test that cannot fail. The
mutation score below is what closes that, because a test that cannot fail leaves a
mutant alive.

### Mutation

Stryker's own score over the run that wrote the report, held to the threshold named in
that same report rather than to one restated here. A run that weighed no mutant is
refused instead of scored, because such a run scores NaN and NaN is never below a
threshold. The run is incremental across pushes of one branch; the nightly run on the
default branch re-judges everything and is what the incremental results are checked by.

| Score | Detected | Weighed | Break |
| ---: | ---: | ---: | ---: |
| 100.00 | 2174 | 2174 | 100 |

The score may not fall below the threshold, which is 100. At or above it.
`;

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
      gates: GATES,
      limits: LIMITS,
      suites: SUITES,
      mutation: WEIGHED,
      ratchets: { comments: 2, tests: 494 },
    });

    expect(markdown).toBe(RENDERED);
  });
});
