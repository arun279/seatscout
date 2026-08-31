import { describe, expect, it } from "vitest";
import { main, matchesNothing, providesNothing, SETUP, TESTS } from "./main.ts";

const gate = async (
  files: Readonly<Record<string, string>>,
  matched: readonly string[],
  ...argv: readonly string[]
) => {
  const asked: string[] = [];
  const printed: string[] = [];
  const refused: string[] = [];
  const status = await main(
    ["node", "live-injections", ...argv],
    async (path) => files[path] ?? "",
    async (pattern) => {
      asked.push(pattern);
      return matched;
    },
    {
      write: (text) => {
        printed.push(text);
      },
    },
    {
      write: (text) => {
        refused.push(text);
      },
    },
  );
  return { status, asked, said: printed.join(""), refused: refused.join("") };
};

const PROVIDING = {
  [SETUP]: 'provide("liveArea", x);\nconst gone = inject("liveNothing");',
};

describe("the command line", () => {
  it("reads the live suite's own setup and its own tests by default", () => {
    expect(SETUP).toBe("tools/live-answers.mjs");
    expect(TESTS).toBe("{apps,packages,tools}/*/**/*.live.test.ts");
  });

  it("reads the setup and the live suite it is given no argument for", async () => {
    const { asked } = await gate(
      { ...PROVIDING, "a.live.test.ts": 'inject("liveArea");' },
      ["a.live.test.ts"],
    );

    expect(asked).toStrictEqual([TESTS]);
  });

  it("reads whatever setup and pattern it is given", async () => {
    const { asked, status } = await gate(
      {
        "other.mjs": 'provide("liveArea", x);',
        "b.txt": 'inject("liveArea");',
      },
      ["b.txt"],
      "other.mjs",
      "planted/*.txt",
    );

    expect(asked).toStrictEqual(["planted/*.txt"]);
    expect(status).toBe(0);
  });

  it("passes and says what is provided when every injection is answered", async () => {
    const { status, said } = await gate(
      { ...PROVIDING, "a.live.test.ts": 'inject("liveArea");' },
      ["a.live.test.ts"],
    );

    expect(status).toBe(0);
    expect(said).toBe(
      `${SETUP} provides every value the live suite injects: liveArea\n`,
    );
  });

  it("fails and names the injection nothing provides", async () => {
    const { status, refused } = await gate(
      { ...PROVIDING, "a.live.test.ts": 'inject("liveShowtime");' },
      ["a.live.test.ts"],
    );

    expect(status).toBe(1);
    expect(refused).toContain("a.live.test.ts injects liveShowtime");
  });

  it("reads every file the pattern matched, not only the first", async () => {
    const { refused } = await gate(
      {
        ...PROVIDING,
        "a.live.test.ts": 'inject("liveArea");',
        "b.live.test.ts": 'inject("liveShowtime");',
      },
      ["a.live.test.ts", "b.live.test.ts"],
    );

    expect(refused).toContain("b.live.test.ts injects liveShowtime");
  });

  it("refuses a setup that provides nothing, rather than passing over nothing", async () => {
    const { status, refused } = await gate(
      { [SETUP]: "export default async () => {};" },
      ["a.live.test.ts"],
    );

    expect(status).toBe(1);
    expect(refused).toBe(providesNothing(SETUP));
    expect(refused).toContain("provides no value at all");
  });

  it("refuses a pattern that matches no live test, rather than passing over nothing", async () => {
    const { status, refused } = await gate(PROVIDING, []);

    expect(status).toBe(1);
    expect(refused).toBe(matchesNothing(TESTS));
    expect(refused).toContain("matches no live test");
  });

  it("reads the files in one order however the pattern matched them", async () => {
    const files = {
      ...PROVIDING,
      "a.live.test.ts": 'inject("liveOne");',
      "b.live.test.ts": 'inject("liveTwo");',
    };
    const forward = await gate(files, ["a.live.test.ts", "b.live.test.ts"]);
    const backward = await gate(files, ["b.live.test.ts", "a.live.test.ts"]);

    expect(forward.refused).toBe(backward.refused);
  });
});
