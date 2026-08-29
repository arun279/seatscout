import { describe, expect, it } from "vitest";
import {
  agreement,
  askedIn,
  namesIn,
  refusal,
  unanswered,
} from "./injections.ts";

describe("reading the names out of a source", () => {
  it("takes the name a call is given, and only from that call", () => {
    const source =
      'provide("liveArea", x);\ninject("liveArea");\nprovide("liveSearch", y);';

    expect(namesIn(source, "provide")).toStrictEqual([
      "liveArea",
      "liveSearch",
    ]);
    expect(namesIn(source, "inject")).toStrictEqual(["liveArea"]);
  });

  it("reads no name out of a source that makes no such call", () => {
    expect(namesIn("export default async () => {};", "provide")).toStrictEqual(
      [],
    );
  });

  it("carries the file each injection was asked from", () => {
    expect(
      askedIn(
        "a.live.test.ts",
        'provide("liveSearch", x);\ninject("liveArea");',
      ),
    ).toStrictEqual([{ file: "a.live.test.ts", name: "liveArea" }]);
  });
});

describe("holding the suite to the setup", () => {
  it("keeps the injection nothing provides", () => {
    expect(
      unanswered(
        ["liveArea"],
        [
          { file: "a.live.test.ts", name: "liveArea" },
          { file: "a.live.test.ts", name: "liveShowtime" },
        ],
      ),
    ).toStrictEqual([{ file: "a.live.test.ts", name: "liveShowtime" }]);
  });

  it("names the setup, what it provides, and every injection it does not", () => {
    expect(
      refusal(
        "setup.mjs",
        ["liveArea", "liveSearch"],
        [
          { file: "a.live.test.ts", name: "liveShowtime" },
          { file: "b.live.test.ts", name: "liveSeatMap" },
        ],
      ),
    ).toBe(
      "setup.mjs provides liveArea, liveSearch, and the live suite asks for more:\n" +
        "  a.live.test.ts injects liveShowtime\n" +
        "  b.live.test.ts injects liveSeatMap\n",
    );
  });

  it("names everything the setup provides when nothing is missing", () => {
    expect(agreement("setup.mjs", ["liveArea", "liveSearch"])).toBe(
      "setup.mjs provides every value the live suite injects: liveArea, liveSearch\n",
    );
  });
});
