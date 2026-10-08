import { describe, expect, it } from "vitest";
import type { Bundle } from "./bundles.js";
import { main, type Measure } from "./main.js";
import { measurement, weighed } from "./report.fixtures.js";

const WITHIN: Bundle = { name: "app for iOS", main: 15, change: 15 };
const GREW: Bundle = { name: "app for iOS", main: 15, change: 90 };

const harness = (bundle: Bundle = WITHIN) => {
  const asked: {
    base: string;
    head: string;
    mainTree: string;
    mainExported: boolean;
  }[] = [];
  const written: { path: string; contents: string }[] = [];
  const printed: string[] = [];

  const measure: Measure = (base, head, mainTree, mainExported) => {
    asked.push({ base, head, mainTree, mainExported });
    return measurement({ bundles: weighed([bundle]) });
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

    run("--main-tree", "main");

    expect(asked).toStrictEqual([
      {
        base: "origin/main",
        head: "HEAD",
        mainTree: "main",
        mainExported: true,
      },
    ]);
  });

  it("tells the measurement when main could not be exported", () => {
    const { run, asked } = harness();

    run("--main-tree", "main", "--main-unexported");

    expect(asked).toMatchObject([{ mainExported: false }]);
  });

  it("compares whatever base and head it is given", () => {
    const { run, asked } = harness();

    run("--base", "abc123", "--head", "def456", "--main-tree", "main");

    expect(asked).toStrictEqual([
      { base: "abc123", head: "def456", mainTree: "main", mainExported: true },
    ]);
  });

  it("measures nothing without main's export to weigh the bundles against", () => {
    const { run, asked, printed } = harness();

    expect(run()).toBe(2);
    expect(asked).toStrictEqual([]);
    expect(printed[0]).toContain("usage: footprint --main-tree");
  });

  it("prints the report and writes it where it is told", () => {
    const { run, written, printed } = harness();

    run("--main-tree", "main", "--out", "footprint.md");

    expect(written).toHaveLength(1);
    expect(written[0]?.path).toBe("footprint.md");
    expect(written[0]?.contents).toBe(printed[0]);
    expect(printed[0]).toContain("### Code footprint");
  });

  it("prints without writing when it is given nowhere to write", () => {
    const { run, written, printed } = harness();

    run("--main-tree", "main");

    expect(written).toStrictEqual([]);
    expect(printed).toHaveLength(1);
  });

  it("succeeds when the gates hold and fails when one does not", () => {
    expect(harness().run("--main-tree", "main")).toBe(0);
    expect(harness(GREW).run("--main-tree", "main")).toBe(1);
  });

  it("passes a grown bundle only when told the pull request carries the bundle-grows label", () => {
    expect(harness(GREW).run("--main-tree", "main", "--bundle-grows")).toBe(0);
  });
});
