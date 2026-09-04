import { describe, expect, it } from "vitest";
import { seatMapCaptures } from "../corpus/captures.js";
import { type Seat, seatsFrom } from "../source/seat-map.js";
import {
  accessibleIn,
  bandBetween,
  FETCHED_AT,
  type Pair,
} from "./seat-group.fixtures.js";
import { rowsOf, seatGroupsIn } from "./seat-group.js";

const asStandard = ({ lower, higher }: Pair): Pair => ({
  lower: { ...lower, designation: "standard" },
  higher: { ...higher, designation: "standard" },
});

const capturedAuditoriums = (): readonly (readonly Seat[])[] =>
  [...seatMapCaptures.values()].map((capture) => {
    const seats = seatsFrom(JSON.stringify(capture.body), FETCHED_AT);
    if (seats === null)
      throw new Error("the corpus holds a seat map that will not read");
    return seats;
  });

const pairsIn = (row: readonly Seat[]): readonly Pair[] => {
  const pairs: Pair[] = [];
  let lower: Seat | undefined;
  for (const higher of row) {
    if (lower !== undefined) pairs.push({ lower, higher });
    lower = higher;
  }
  return pairs;
};

const tallyBands = (pairs: readonly Pair[]) => {
  const tally = { contiguous: 0, pod: 0, aisle: 0 };
  for (const pair of pairs) tally[bandBetween(pair)] += 1;
  return tally;
};

const ordinary = (seat: Seat) =>
  seat.bookable && seat.designation === "standard";

describe("Seat Group construction over the captured corpus", () => {
  it("sorts every in-row gap into the three bands, and re-reads an accessible space's width as no console", () => {
    const drawnRows = capturedAuditoriums().flatMap(rowsOf);
    const pairs = drawnRows.flatMap(pairsIn);

    expect(drawnRows).toHaveLength(376);
    expect(pairs).toHaveLength(6395);
    expect(tallyBands(pairs.map(asStandard))).toEqual({
      contiguous: 5688,
      pod: 540,
      aisle: 167,
    });
    expect(tallyBands(pairs)).toEqual({
      contiguous: 5766,
      pod: 462,
      aisle: 167,
    });
  });

  it("seats a party of three in every captured Auditorium that has three free Seats in one row", () => {
    const auditoriums = capturedAuditoriums();
    const groupsFor = (seats: readonly Seat[]) =>
      seatGroupsIn(seats, { partySize: 3, accessibleSeating: false });
    const counting = (holds: (seats: readonly Seat[]) => boolean) =>
      auditoriums.filter(holds).length;

    expect({
      auditoriums: auditoriums.length,
      withThreeFreeSeatsInARow: counting((seats) =>
        rowsOf(seats).some((row) => row.filter(ordinary).length >= 3),
      ),
      seatingThem: counting((seats) => groupsFor(seats).length > 0),
      seatingThemOnlyAcrossAConsole: counting((seats) => {
        const groups = groupsFor(seats);
        return (
          groups.length > 0 && groups.every((group) => group.podDividers > 0)
        );
      }),
    }).toEqual({
      auditoriums: 42,
      withThreeFreeSeatsInARow: 42,
      seatingThem: 42,
      seatingThemOnlyAcrossAConsole: 5,
    });
  });

  it("holds every neighbour link the Source sent to the geometry, and finds that links are not adjacency", () => {
    const auditoriums = capturedAuditoriums();
    const pairs = auditoriums.flatMap((seats) =>
      rowsOf(seats).flatMap(pairsIn),
    );
    const linksAcross = ({ lower, higher }: Pair) =>
      (lower.rightNeighbour === higher.id ? 1 : 0) +
      (higher.leftNeighbour === lower.id ? 1 : 0);
    const carried = (pick: (seat: Seat) => string | null) =>
      auditoriums.flat().filter((seat) => pick(seat) !== null).length;
    const linksOver = (over: readonly Pair[]) =>
      over.reduce((total, pair) => total + linksAcross(pair), 0);

    expect({
      links:
        carried((seat) => seat.leftNeighbour) +
        carried((seat) => seat.rightNeighbour),
      namingAnImmediateNeighbour: linksOver(pairs),
      acrossAContiguousGap: linksOver(
        pairs.filter((pair) => bandBetween(pair) === "contiguous"),
      ),
      contiguousGapsCarryingNoLink: pairs.filter(
        (pair) => linksAcross(pair) === 0 && bandBetween(pair) === "contiguous",
      ).length,
    }).toEqual({
      links: 10974,
      namingAnImmediateNeighbour: 10974,
      acrossAContiguousGap: 10974,
      contiguousGapsCarryingNoLink: 279,
    });
  });

  it("answers every captured Auditorium that has a bookable accessible Seat with one, and no other Auditorium at all", () => {
    const auditoriums = capturedAuditoriums();
    const groupsFor = (seats: readonly Seat[], accessibleSeating: boolean) =>
      seatGroupsIn(seats, { partySize: 2, accessibleSeating });

    expect({
      withABookableAccessibleSeat: auditoriums.filter(
        (seats) => accessibleIn(seats.filter((seat) => seat.bookable)) > 0,
      ).length,
      answeringWithOne: auditoriums.filter(
        (seats) => groupsFor(seats, true).length > 0,
      ).length,
      groupsCarryingNone: auditoriums
        .flatMap((seats) => groupsFor(seats, true))
        .filter((group) => accessibleIn(group.seats) === 0).length,
      offeredOrdinarily: auditoriums
        .flatMap((seats) => groupsFor(seats, false))
        .reduce((total, group) => total + accessibleIn(group.seats), 0),
    }).toEqual({
      withABookableAccessibleSeat: 40,
      answeringWithOne: 40,
      groupsCarryingNone: 0,
      offeredOrdinarily: 0,
    });
  });
});
