import { describe, expect, inject, it } from "vitest";
import { seatsFrom } from "../source/seat-map.js";
import {
  type Answer,
  areaDivergencesIn,
  divergencesIn,
  listingDivergencesIn,
} from "./contract.js";

declare module "vitest" {
  interface ProvidedContext {
    readonly liveSeatMaps: readonly Answer[];
    readonly liveArea: Answer;
    readonly liveListing: Answer;
  }
}

describe("the live Source against the contract the corpus recorded", () => {
  it("answers at least one seat map that reads as an Auditorium", () => {
    expect(
      inject("liveSeatMaps").filter(
        (answer) => (seatsFrom(answer.body, answer.fetchedAt) ?? []).length > 0,
      ).length,
    ).toBeGreaterThan(0);
  });

  it("sends no seat map that diverges from what the corpus recorded", () => {
    expect(inject("liveSeatMaps").flatMap(divergencesIn)).toEqual([]);
  });

  it("answers an area of Theaters and a listing of Showtimes, neither of them empty", () => {
    expect([
      ...areaDivergencesIn(inject("liveArea")),
      ...listingDivergencesIn(inject("liveListing")),
    ]).toEqual([]);
  });
});
