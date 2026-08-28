import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { seatMapCaptures } from "../corpus/captures.js";
import { type Designation, type Seat, seatsFrom } from "../source/seat-map.js";
import {
  type SeatGroup,
  type SeatGroupTerms,
  seatGroupsIn,
} from "./seat-group.js";

type Band = "contiguous" | "pod" | "aisle";

interface Cell {
  readonly gapBefore: Band;
  readonly designation: Designation;
  readonly bookable: boolean;
}

interface Placed {
  readonly seat: Seat;
  readonly cell: Cell;
  readonly column: number;
}

interface Room {
  readonly seats: readonly Seat[];
  readonly placed: ReadonlyMap<string, Placed>;
}

interface Pair {
  readonly lower: Seat;
  readonly higher: Seat;
}

const FETCHED_AT = 1000;
const SEAT_WIDTH = 100;
const ROW_PITCH = 500;

const SPACING: Readonly<Record<Band, number>> = {
  contiguous: 130,
  pod: 180,
  aisle: 300,
};

const cellOf = (
  gapBefore: Band,
  bookable: boolean,
  designation: Designation = "standard",
): Cell => ({ gapBefore, designation, bookable });

const free = (gapBefore: Band = "contiguous") => cellOf(gapBefore, true);
const taken = (gapBefore: Band = "contiguous") => cellOf(gapBefore, false);

const seatAt = (id: string, x: number, y: number, cell: Cell): Seat => ({
  id,
  designation: cell.designation,
  bookable: cell.bookable,
  x,
  y,
  width: SEAT_WIDTH,
  height: SEAT_WIDTH,
  leftNeighbour: null,
  rightNeighbour: null,
  provenance: {
    source: "aggregator",
    fetchedAt: FETCHED_AT,
    upstreamStatus: cell.bookable ? "A" : "R",
  },
});

const roomFrom = (rows: readonly (readonly Cell[])[]): Room => {
  const placed = rows.flatMap((row, depth) =>
    row.map((cell, column) => ({
      cell,
      column,
      seat: seatAt(
        `${depth}.${column}`,
        row
          .slice(1, column + 1)
          .reduce((x, before) => x + SPACING[before.gapBefore], 0),
        depth * ROW_PITCH,
        cell,
      ),
    })),
  );
  return {
    seats: placed.map((entry) => entry.seat),
    placed: new Map(placed.map((entry) => [entry.seat.id, entry])),
  };
};

const placesIn = (room: Room, group: SeatGroup) =>
  group.seats.map((seat) => {
    const place = room.placed.get(seat.id);
    if (place === undefined) throw new Error(`${seat.id} is not in this room`);
    return place;
  });

const idsIn = (groups: readonly SeatGroup[]) =>
  groups.map((group) => ({
    seats: group.seats.map((seat) => seat.id),
    podDividers: group.podDividers,
  }));

const bandBetween = ({ lower, higher }: Pair): Band => {
  const pair = [lower, higher].map((seat) => ({ ...seat, bookable: true }));
  const [group] = seatGroupsIn(pair, {
    partySize: 2,
    accessibleSeating: pair.some((seat) => seat.designation !== "standard"),
  });
  if (group === undefined) return "aisle";
  return group.podDividers === 1 ? "pod" : "contiguous";
};

const pairAt = (
  spacing: number,
  left: Designation,
  right: Designation,
): Pair => ({
  lower: seatAt("0.0", 0, 0, cellOf("contiguous", true, left)),
  higher: seatAt("0.1", spacing, 0, cellOf("contiguous", true, right)),
});

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

const rowsOf = (seats: readonly Seat[]): readonly (readonly Seat[])[] => {
  const rows = new Map<number, Seat[]>();
  for (const seat of seats) {
    const row = rows.get(seat.y);
    if (row === undefined) rows.set(seat.y, [seat]);
    else row.push(seat);
  }
  return [...rows.entries()]
    .sort(([above], [below]) => above - below)
    .map(([, row]) => row.toSorted((left, right) => left.x - right.x));
};

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

const accessibleIn = (seats: readonly Seat[]) =>
  seats.filter((seat) => seat.designation !== "standard").length;

const designation = fc.oneof(
  { arbitrary: fc.constant<Designation>("standard"), weight: 6 },
  { arbitrary: fc.constant<Designation>("wheelchair"), weight: 1 },
  { arbitrary: fc.constant<Designation>("companion"), weight: 1 },
);

const gapBefore = fc.oneof(
  { arbitrary: fc.constant<Band>("contiguous"), weight: 6 },
  { arbitrary: fc.constant<Band>("pod"), weight: 3 },
  { arbitrary: fc.constant<Band>("aisle"), weight: 1 },
);

const ADVERSARIAL_ROWS: readonly (readonly Cell[])[] = [
  [free()],
  [free(), free()],
  Array.from({ length: 10 }, () => free()),
  Array.from({ length: 10 }, () => taken()),
  Array.from({ length: 10 }, (_, column) =>
    column % 2 === 0 ? free() : taken(),
  ),
  [free(), free("aisle"), free(), free(), free(), free("aisle"), free()],
  [
    free(),
    free(),
    cellOf("pod", true, "wheelchair"),
    cellOf("pod", true, "companion"),
    free(),
    free(),
  ],
  [free(), free("pod"), free(), free("pod"), free()],
  [free(), taken("aisle"), free("aisle"), free()],
];

const rows = fc.oneof(
  fc.constantFrom(...ADVERSARIAL_ROWS),
  fc.array(fc.record({ gapBefore, designation, bookable: fc.boolean() }), {
    minLength: 1,
    maxLength: 12,
  }),
);

const rooms = fc.array(rows, { minLength: 1, maxLength: 6 }).map(roomFrom);

const partySize = fc.integer({ min: 1, max: 6 });

const terms: fc.Arbitrary<SeatGroupTerms> = fc.record({
  partySize,
  accessibleSeating: fc.boolean(),
});

describe("Seat Group construction", () => {
  it("emits only runs of the party's size, in one row, unbroken by an aisle", () => {
    fc.assert(
      fc.property(rooms, terms, (room, asked) => {
        for (const group of seatGroupsIn(room.seats, asked)) {
          const places = placesIn(room, group);

          expect(group.seats).toHaveLength(asked.partySize);
          expect(group.seats.every((seat) => seat.bookable)).toBe(true);
          expect(new Set(group.seats.map((seat) => seat.y)).size).toBe(1);
          expect(
            new Set(places.map((place, index) => place.column - index)).size,
          ).toBe(1);
          expect(
            places.slice(1).map((place) => place.cell.gapBefore),
          ).not.toContain("aisle");
        }
      }),
    );
  });

  it("keeps wheelchair and companion Seats out of ordinary construction, and counts the consoles it crosses", () => {
    fc.assert(
      fc.property(rooms, partySize, (room, size) => {
        for (const group of seatGroupsIn(room.seats, {
          partySize: size,
          accessibleSeating: false,
        })) {
          const places = placesIn(room, group);
          const designations = places.map((place) => place.cell.designation);

          expect(designations).not.toContain("wheelchair");
          expect(designations).not.toContain("companion");
          expect(group.podDividers).toBe(
            places.slice(1).filter((place) => place.cell.gapBefore === "pod")
              .length,
          );
        }
      }),
    );
  });

  it("offers nothing without a wheelchair or companion Seat once a Query asks for accessible seating", () => {
    fc.assert(
      fc.property(rooms, partySize, (room, size) => {
        for (const group of seatGroupsIn(room.seats, {
          partySize: size,
          accessibleSeating: true,
        }))
          expect(accessibleIn(group.seats)).toBeGreaterThan(0);
      }),
    );
  });

  it("never offers a Seat twice, so a longer run is one Seat Group and not a family of shifted ones", () => {
    fc.assert(
      fc.property(rooms, terms, (room, asked) => {
        const offered = seatGroupsIn(room.seats, asked).flatMap((group) =>
          group.seats.map((seat) => seat.id),
        );

        expect(new Set(offered).size).toBe(offered.length);
      }),
    );
  });

  it("answers a whole free row with one centred Seat Group however long the row is", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 1, max: 8 }),
        (length, size) => {
          const room = roomFrom([Array.from({ length }, () => free())]);
          const groups = seatGroupsIn(room.seats, {
            partySize: size,
            accessibleSeating: false,
          });

          expect(groups).toHaveLength(length >= size ? 1 : 0);
          for (const group of groups) {
            const before = Math.min(
              ...placesIn(room, group).map((place) => place.column),
            );
            const after = length - size - before;

            expect(after - before).toBeGreaterThanOrEqual(0);
            expect(after - before).toBeLessThanOrEqual(1);
          }
        },
      ),
    );
  });

  it("crosses a console only when every window in the run crosses one", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<Band>("contiguous", "pod"), {
          minLength: 1,
          maxLength: 12,
        }),
        fc.integer({ min: 1, max: 6 }),
        (gaps, size) => {
          const room = roomFrom([gaps.map((band) => free(band))]);
          const consoleFreeWindow = Array.from(
            { length: Math.max(0, gaps.length - size + 1) },
            (_, start) => gaps.slice(start + 1, start + size),
          ).some((inside) => inside.every((band) => band !== "pod"));
          const [group] = seatGroupsIn(room.seats, {
            partySize: size,
            accessibleSeating: false,
          });

          if (group === undefined) return;
          expect(group.podDividers === 0).toBe(consoleFreeWindow);
        },
      ),
    );
  });

  it("reads the same Seat Groups from a room whose neighbour links are absent, truthful or nonsense", () => {
    fc.assert(
      fc.property(rooms, terms, (room, asked) => {
        const relinked = (step: number) =>
          room.seats.map((seat, index) => ({
            ...seat,
            leftNeighbour: room.seats[index - 1]?.id ?? null,
            rightNeighbour:
              room.seats[(index * step + 1) % room.seats.length]?.id ?? null,
          }));
        const asDrawn = idsIn(seatGroupsIn(room.seats, asked));

        expect(idsIn(seatGroupsIn(relinked(1), asked))).toEqual(asDrawn);
        expect(idsIn(seatGroupsIn(relinked(7), asked))).toEqual(asDrawn);
      }),
    );
  });

  it("puts the band boundaries where the corpus measured them, and calls an accessible space's own width no console", () => {
    expect({
      "1.45": bandBetween(pairAt(145, "standard", "standard")),
      "1.46": bandBetween(pairAt(146, "standard", "standard")),
      "2.05": bandBetween(pairAt(205, "standard", "standard")),
      "2.06": bandBetween(pairAt(206, "standard", "standard")),
      "1.80 left of a wheelchair space": bandBetween(
        pairAt(180, "standard", "wheelchair"),
      ),
      "1.80 right of a companion seat": bandBetween(
        pairAt(180, "companion", "standard"),
      ),
    }).toEqual({
      "1.45": "contiguous",
      "1.46": "pod",
      "2.05": "pod",
      "2.06": "aisle",
      "1.80 left of a wheelchair space": "contiguous",
      "1.80 right of a companion seat": "contiguous",
    });
  });

  it("takes the window that avoids a console, and says how many it could not avoid", () => {
    const forParty = (room: Room) =>
      idsIn(
        seatGroupsIn(room.seats, { partySize: 3, accessibleSeating: false }),
      );

    expect({
      "a console three seats in": forParty(
        roomFrom([[free(), free(), free(), free("pod"), free()]]),
      ),
      "a console one seat in": forParty(
        roomFrom([[free(), free("pod"), free(), free(), free()]]),
      ),
      "a console at every gap": forParty(
        roomFrom([[free(), free("pod"), free("pod")]]),
      ),
    }).toEqual({
      "a console three seats in": [
        { seats: ["0.0", "0.1", "0.2"], podDividers: 0 },
      ],
      "a console one seat in": [
        { seats: ["0.1", "0.2", "0.3"], podDividers: 0 },
      ],
      "a console at every gap": [
        { seats: ["0.0", "0.1", "0.2"], podDividers: 2 },
      ],
    });
  });

  it("hands a wheelchair space and its companion seat to a Query that asks for them and to no other", () => {
    const beside = roomFrom([
      [
        free(),
        cellOf("pod", true, "wheelchair"),
        cellOf("pod", true, "companion"),
        free(),
      ],
    ]);
    const atOneEnd = roomFrom([
      [free(), free(), free(), free(), cellOf("pod", true, "wheelchair")],
    ]);
    const withNone = roomFrom([[free(), free(), free()]]);
    const forParty = (room: Room, size: number, accessibleSeating: boolean) =>
      idsIn(seatGroupsIn(room.seats, { partySize: size, accessibleSeating }));

    expect({
      "a pair, ordinarily": forParty(beside, 2, false),
      "one alone, ordinarily": forParty(beside, 1, false),
      "a pair, asked for": forParty(beside, 2, true),
      "all four, asked for": forParty(beside, 4, true),
      "a pair off centre, ordinarily": forParty(atOneEnd, 2, false),
      "a pair off centre, asked for": forParty(atOneEnd, 2, true),
      "a room with none, asked for": forParty(withNone, 2, true),
    }).toEqual({
      "a pair, ordinarily": [],
      "one alone, ordinarily": [
        { seats: ["0.0"], podDividers: 0 },
        { seats: ["0.3"], podDividers: 0 },
      ],
      "a pair, asked for": [{ seats: ["0.1", "0.2"], podDividers: 0 }],
      "all four, asked for": [
        { seats: ["0.0", "0.1", "0.2", "0.3"], podDividers: 0 },
      ],
      "a pair off centre, ordinarily": [
        { seats: ["0.1", "0.2"], podDividers: 0 },
      ],
      "a pair off centre, asked for": [
        { seats: ["0.3", "0.4"], podDividers: 0 },
      ],
      "a room with none, asked for": [],
    });
  });

  it("orders Seat Groups as the room is drawn, whatever order the Seats arrived in", () => {
    const room = roomFrom([
      [free(), free(), free("aisle"), free(), free()],
      [free(), free(), free()],
    ]);
    const shuffled = room.seats.toSorted((left, right) =>
      left.id < right.id ? 1 : -1,
    );

    expect(
      idsIn(seatGroupsIn(shuffled, { partySize: 2, accessibleSeating: false })),
    ).toEqual([
      { seats: ["0.0", "0.1"], podDividers: 0 },
      { seats: ["0.2", "0.3"], podDividers: 0 },
      { seats: ["1.0", "1.1"], podDividers: 0 },
    ]);
  });
});

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
