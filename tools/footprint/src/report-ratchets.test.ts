import { describe, expect, it } from "vitest";
import {
  between,
  counts,
  reportOn,
  SOME_SOURCE,
  weighed,
} from "./report.fixtures.js";

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
    const holdingNoTooling = {
      "packages/core/src/seat.ts": counts(40, 0),
      "packages/core/src/seat.test.ts": counts(20, 0),
    };

    expect(between(holdingNoTooling, holdingNoTooling).passed).toBe(true);
  });
});

describe("the bundle gate against main", () => {
  const GREW = [
    { name: "app for iOS", main: 1024, change: 2048 },
    { name: "app for Android", main: 90, change: 90 },
  ];
  const LABEL_IT =
    "add the label to this pull request, where a reviewer sees it, and run the failed jobs again.";
  const ASK = `Make the bundle smaller, or ${LABEL_IT}`;

  it("fails a bundle bigger than on main, naming it and both ways through", () => {
    const report = reportOn({ bundles: weighed(GREW) });

    expect(report.passed).toBe(false);
    expect(report.markdown).toContain(
      "| app for iOS | 1024 B | 2048 B | +1024 B |",
    );
    expect(report.markdown).toContain(
      `Needs the \`bundle-grows\` label: app for iOS grew. ${ASK}`,
    );
  });

  it("names every bundle that grew", () => {
    const { markdown } = reportOn({
      bundles: weighed([
        { name: "app for iOS", main: 1024, change: 2048 },
        { name: "app for Android", main: 90, change: 91 },
      ]),
    });

    expect(markdown).toContain(
      `Needs the \`bundle-grows\` label: app for iOS grew; app for Android grew. ${ASK}`,
    );
  });

  it("fails a bundle that grew by a single byte, since no tolerance is set", () => {
    const report = reportOn({
      bundles: weighed([{ name: "app for iOS", main: 15, change: 16 }]),
    });

    expect(report.passed).toBe(false);
  });

  it("holds a bundle main does not have yet as growth from nothing, which the label can accept", () => {
    const report = reportOn({
      bundles: weighed([{ name: "app for the web", main: 0, change: 300 }]),
    });

    expect(report.passed).toBe(false);
    expect(report.markdown).toContain(
      "| app for the web | 0 B | 300 B | +300 B |",
    );
  });

  it("fails a change to the globs even when every bundle held, because narrowing a glob would hide growth", () => {
    const report = reportOn({
      bundles: weighed([{ name: "app for iOS", main: 15, change: 15 }], true),
    });

    expect(report.passed).toBe(false);
    expect(report.markdown).toContain(
      `Needs the \`bundle-grows\` label: \`.size-limit.json\` differs from main's. Put \`.size-limit.json\` back as main's, or ${LABEL_IT}`,
    );
  });

  it("names both causes, and both remedies, when a bundle grew and the globs changed", () => {
    const report = reportOn({
      bundles: weighed([{ name: "app for iOS", main: 15, change: 16 }], true),
    });

    expect(report.markdown).toContain(
      `Make the bundle smaller and put \`.size-limit.json\` back as main's, or ${LABEL_IT}`,
    );
  });

  it("passes growth the bundle-grows label accepts, and says so beside both figures", () => {
    const report = reportOn({ bundles: weighed(GREW, true) }, true);

    expect(report.passed).toBe(true);
    expect(report.markdown).toContain(
      "| app for iOS | 1024 B | 2048 B | +1024 B |",
    );
    expect(report.markdown).toContain(
      "Needs the `bundle-grows` label: app for iOS grew; `.size-limit.json` differs from main's. The label on this pull request accepts it.",
    );
  });

  it("passes a bundle that shrank or held, and prints how much it shrank", () => {
    const report = reportOn({
      bundles: weighed([
        { name: "app for iOS", main: 2048, change: 1024 },
        { name: "app for Android", main: 90, change: 90 },
      ]),
    });

    expect(report.passed).toBe(true);
    expect(report.markdown).toContain(
      "| app for iOS | 2048 B | 1024 B | -1024 B |",
    );
    expect(report.markdown).toContain(
      "No bundle is bigger than on main, and `.size-limit.json` is main's.",
    );
  });

  it("fails a change it could not weigh, saying why in the comment, label or not", () => {
    const report = reportOn(
      { bundles: { kind: "unweighed", reason: "main could not be exported" } },
      true,
    );

    expect(report.passed).toBe(false);
    expect(report.markdown).toContain(
      "The bundles were not weighed: main could not be exported. With nothing to compare, the gate refuses the change.\n\n### ",
    );
  });
});
