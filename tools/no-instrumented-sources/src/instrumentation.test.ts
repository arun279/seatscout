import { describe, expect, it } from "vitest";
import { carrying, DECLARING, MARKERS, refusal } from "./instrumentation.ts";

const CLEAN = "export const total = (a, b) => a + b;";

const tree = (files: Readonly<Record<string, string>>) => {
  const read = (path: string) => {
    const source = files[path];
    if (source === undefined) throw new Error(`no such file: ${path}`);
    return source;
  };
  return { paths: Object.keys(files), read };
};

describe("finding instrumentation", () => {
  it("keeps a file carrying any one marker and drops the rest", () => {
    for (const marker of MARKERS) {
      const { paths, read } = tree({
        "clean.ts": CLEAN,
        "dirty.ts": `${marker}("41");`,
      });

      expect(carrying(paths, read)).toStrictEqual(["dirty.ts"]);
    }
  });

  it("reads every file it is given rather than stopping at the first offender", () => {
    const { paths, read } = tree({
      "one.ts": MARKERS.join("\n"),
      "two.ts": CLEAN,
      "three.ts": MARKERS.join("\n"),
    });

    expect(carrying(paths, read)).toStrictEqual(["one.ts", "three.ts"]);
  });

  it("lets the file that writes the list down carry every marker", () => {
    const { paths, read } = tree({ [DECLARING]: MARKERS.join("\n") });

    expect(carrying(paths, read)).toStrictEqual([]);
  });

  it("judges a file beside the one that writes the list down", () => {
    const beside = DECLARING.replace("instrumentation.ts", "main.ts");
    const { paths, read } = tree({ [beside]: MARKERS.join("\n") });

    expect(carrying(paths, read)).toStrictEqual([beside]);
  });

  it("names every offender, the way back, and the one file that is allowed", () => {
    expect(refusal(["one.ts", "two.ts"])).toBe(
      "Refusing 2 file(s) carrying mutation-test instrumentation:\n" +
        "  one.ts\n  two.ts\n\n" +
        "The mutation runner rewrites sources in place. Restore them with\n" +
        "  git restore <paths>\nand rebuild before committing.\n\n" +
        `${DECLARING} is the one file allowed to spell a marker, because it is\n` +
        "where the list is written down. Everything else is judged, tests included.\n",
    );
  });
});
