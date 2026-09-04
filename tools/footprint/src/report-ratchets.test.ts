import { describe, expect, it } from "vitest";
import { between, counts, reportOn, SOME_SOURCE } from "./report.fixtures.js";

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
      "Tooling held files at the merge base and holds none here. A file leaves the measurement when its path stops matching how this report sorts it. Either put it back, or sort it in tools/footprint/src/volume.ts, where a reviewer sees which side of the count it landed on.",
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

  it("names every unsorted file, in one order, whatever order they arrived in", () => {
    const report = between(SOME_SOURCE, {
      ...SOME_SOURCE,
      "apps/web/src/view.svelte": counts(1, 0),
      "apps/web/src/a.ts.bak": counts(1, 0),
      "apps/proxy/wrangler.json.bak": counts(1, 0),
    });

    expect(report.passed).toBe(false);
    expect(report.markdown).toContain(
      "3 file(s) match nothing this report sorts by, so their lines are in no column: apps/proxy/wrangler.json.bak, apps/web/src/a.ts.bak, apps/web/src/view.svelte.",
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
