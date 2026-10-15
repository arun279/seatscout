import { describe, expect, it } from "vitest";
import { nextOf } from "./step.js";

describe("the step a Query needs next", () => {
  it("is the area while there is none, whatever else the Query names", () => {
    expect(nextOf({})).toBe("area");
    expect(nextOf({ movie: "245569" })).toBe("area");
  });

  it("is the Movie once the area is named", () => {
    expect(nextOf({ area: "75006" })).toBe("movie");
  });

  it("is nothing once both are named, because the search can run", () => {
    expect(nextOf({ area: "75006", movie: "245569" })).toBeUndefined();
  });
});
