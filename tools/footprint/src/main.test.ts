import { describe, expect, it } from "vitest";
import type { Bundle } from "./bundles.js";
import { main, type Measure } from "./main.js";
import { measurement } from "./report.fixtures.js";

const WITHIN: Bundle = {
  name: "web app",
  size: 15,
  sizeLimit: 15,
  passed: true,
};

const harness = (bundle: Bundle = WITHIN) => {
  const asked: { base: string; head: string }[] = [];
  const written: { path: string; contents: string }[] = [];
  const printed: string[] = [];

  const measure: Measure = (base, head) => {
    asked.push({ base, head });
    return measurement({ bundles: [bundle] });
  };

  const run = (...argv: readonly string[]) =>
    main(
      ["node", "footprint", ...argv],
      measure,
      (path, contents) => {
        written.push({ path, contents });
      },
      {
        write: (text) => {
          printed.push(text);
        },
      },
    );

  return { run, asked, written, printed };
};

describe("the command line", () => {
  it("compares HEAD against its merge base with origin/main by default", () => {
    const { run, asked } = harness();

    run();

    expect(asked).toStrictEqual([{ base: "origin/main", head: "HEAD" }]);
  });

  it("compares whatever base and head it is given", () => {
    const { run, asked } = harness();

    run("--base", "abc123", "--head", "def456");

    expect(asked).toStrictEqual([{ base: "abc123", head: "def456" }]);
  });

  it("prints the report and writes it where it is told", () => {
    const { run, written, printed } = harness();

    run("--out", "footprint.md");

    expect(written).toHaveLength(1);
    expect(written[0]?.path).toBe("footprint.md");
    expect(written[0]?.contents).toBe(printed[0]);
    expect(printed[0]).toContain("### Code footprint");
  });

  it("prints without writing when it is given nowhere to write", () => {
    const { run, written, printed } = harness();

    run();

    expect(written).toStrictEqual([]);
    expect(printed).toHaveLength(1);
  });

  it("succeeds when the gates hold and fails when one does not", () => {
    expect(harness().run()).toBe(0);
    expect(
      harness({
        name: "web app",
        size: 90,
        sizeLimit: 15,
        passed: false,
      }).run(),
    ).toBe(1);
  });
});
