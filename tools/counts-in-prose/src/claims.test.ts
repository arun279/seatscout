import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { CLAIMS } from "./claims.ts";
import { agreement, disagreements } from "./judge.ts";

const committed = (path: string): string =>
  execFileSync("git", ["show", `HEAD:${path}`], {
    encoding: "utf8",
    maxBuffer: Infinity,
  });

describe("the declared pairs", () => {
  it("agree with the tree they are committed beside", () => {
    expect(
      disagreements(CLAIMS, committed).map(
        ({ claim, disagreement }) => `${claim.document}: ${disagreement}`,
      ),
    ).toStrictEqual([]);
  });

  it("hold exactly these structures, so a pair cannot go missing in silence", () => {
    expect(
      agreement(CLAIMS),
    ).toBe(`Every count stated in prose matches the structure it counts, over 21 declared pairs:
  the weights of SeatProfile, in packages/core/src/domain/seat-profile.ts
  the weights of REFERENCE below its heaviest, in packages/core/src/domain/seat-profile.ts
  the alternatives of Unverified, in packages/client/src/verify.ts, and the arms of Verified that succeed
  every field of Coverage but candidates, in packages/client/src/search.ts
  the alternatives of Gap, in packages/core/src/domain/seat-group.ts
  the modelled distances of SeatProfile, in packages/core/src/domain/seat-profile.ts
  the fields of UpstreamSeat, in packages/core/src/source/seat-map.ts
  the fields of Catalogue, in packages/core/src/domain/catalogue.ts
  the alternatives of Unverified, in packages/client/src/verify.ts
  the kinds of Divergence, in packages/core/src/testing/contract.ts
  the globals biome.json denies under packages
  the fields of Source, in packages/core/src/source/port.ts
  the alternatives of Amenity, in packages/core/src/domain/catalogue.ts
  the entries of CHAINS, in packages/core/src/source/catalogue.ts
`);
  });
});
