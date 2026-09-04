import { describe, expect, it } from "vitest";
import { counts } from "./report.fixtures.js";
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
      commentRatchet: 2,
    });

    expect(markdown).toBe(RENDERED);
  });
});
