import { describe, expect, it } from "vitest";
import { AGREES, DISAGREES, PLANTED } from "../planted/claims.ts";
import { read } from "./file.ts";
import { disagreements } from "./judge.ts";
import { main } from "./main.ts";

describe("the planted red", () => {
  it("refuses the planted pair whose prose has gone stale, and only that one", () => {
    expect(
      disagreements(PLANTED, read).map(({ claim, disagreement }) => [
        claim.about,
        disagreement,
      ]),
    ).toStrictEqual([
      [
        DISAGREES,
        '"A planted Gap is one of two bands." counts ' +
          `${DISAGREES}, and there are 3`,
      ],
    ]);
  });

  it("accepts the planted pair that agrees, so it is not refusing everything", () => {
    const kept = PLANTED.filter((claim) => claim.about === AGREES);

    expect(disagreements(kept, read)).toStrictEqual([]);
  });

  it("fails the run the planted pair is in", () => {
    const refused: string[] = [];

    expect(
      main(
        PLANTED,
        read,
        { write: () => {} },
        {
          write: (text) => {
            refused.push(text);
          },
        },
      ),
    ).toBe(1);
    expect(refused.join("")).toContain("1 count(s) stated in prose");
  });
});
