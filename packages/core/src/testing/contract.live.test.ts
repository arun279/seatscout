import { describe, expect, inject, it } from "vitest";
import { seatsFrom } from "../source/seat-map.js";
import {
  type Answer,
  areaDivergencesIn,
  type Divergence,
  divergencesIn,
  listingDivergencesIn,
  scheduleDivergencesIn,
} from "./contract.js";

declare module "vitest" {
  interface ProvidedContext {
    readonly liveSeatMaps: readonly Answer[];
    readonly liveArea: Answer;
    readonly liveSchedule: Answer;
    readonly liveListing: Answer;
  }
  interface TaskMeta {
    contract?: readonly string[];
  }
}

const SAYING: Readonly<Record<Divergence["kind"], string>> = {
  unreadable: "an answer that is not JSON",
  missing: "a field the parse needs and the answer no longer carries",
  empty: "an answer that parses into nothing at all",
  unexpected: "a key the corpus never recorded",
  status: "a seat status neither the corpus recorded nor a measurement settled",
  type: "a seat type the corpus never recorded",
  sellability: "a word for on sale on a row the catalogue did not refuse",
  link: "a neighbour link that disagrees with the geometry",
};

const saying = (divergences: readonly Divergence[]): readonly string[] =>
  divergences.map(
    (divergence) => `${SAYING[divergence.kind]}: \`${divergence.name}\``,
  );

describe("the live Source against the contract the corpus recorded", () => {
  it("answers at least one seat map that reads as an Auditorium", ({
    task,
  }) => {
    task.meta.contract = [
      "not one live answer read as an Auditorium with Seats in it",
    ];
    expect(
      inject("liveSeatMaps").filter(
        (answer) => (seatsFrom(answer.body, answer.fetchedAt) ?? []).length > 0,
      ).length,
    ).toBeGreaterThan(0);
  });

  it("sends no seat map that diverges from what the corpus recorded", ({
    task,
  }) => {
    task.meta.contract = saying(inject("liveSeatMaps").flatMap(divergencesIn));
    expect(task.meta.contract).toEqual([]);
  });

  it("answers an area of Theaters, a Theater's schedule of Movies and a listing of Showtimes, none of them empty", ({
    task,
  }) => {
    task.meta.contract = saying([
      ...areaDivergencesIn(inject("liveArea")),
      ...scheduleDivergencesIn(inject("liveSchedule")),
      ...listingDivergencesIn(inject("liveListing")),
    ]);
    expect(task.meta.contract).toEqual([]);
  });
});
