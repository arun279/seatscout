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
  readonly band: Band;
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

const HUNDREDTHS: Readonly<Record<Band, number>> = {
  contiguous: 130,
  pod: 180,
  aisle: 300,
};

const cellOf = (
  band: Band,
  bookable: boolean,
  designation: Designation = "standard",
): Cell => ({ band, designation, bookable });

const free = (band: Band = "contiguous") => cellOf(band, true);
const taken = (band: Band = "contiguous") => cellOf(band, false);

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
          .reduce((x, before) => x + HUNDREDTHS[before.band], 0),
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
  const [group] = seatGroupsIn(
    [
      { ...lower, bookable: true },
      { ...higher, bookable: true },
    ],
    { partySize: 2, accessibleSeating: true },
  );
  if (group === undefined) return "aisle";
  return group.podDividers === 1 ? "pod" : "contiguous";
};

const pairAt = (
  hundredths: number,
  left: Designation,
  right: Designation,
): Pair => ({
  lower: seatAt("0.0", 0, 0, cellOf("contiguous", true, left)),
  higher: seatAt("0.1", hundredths, 0, cellOf("contiguous", true, right)),
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
  return [...rows.values()].map((row) =>
    row.toSorted((left, right) => left.x - right.x),
  );
};

const pairsIn = (row: readonly Seat[]): readonly Pair[] =>
  row
    .slice(1)
    .flatMap((higher, index) =>
      row.slice(index, index + 1).map((lower) => ({ lower, higher })),
    );

const inRowPairs = (auditoriums: readonly (readonly Seat[])[]) =>
  auditoriums.flatMap((seats) => rowsOf(seats).flatMap(pairsIn));

const tallyBands = (pairs: readonly Pair[]) => {
  const tally = { contiguous: 0, pod: 0, aisle: 0 };
  for (const pair of pairs) tally[bandBetween(pair)] += 1;
  return tally;
};

const ordinary = (seat: Seat) =>
  seat.bookable && seat.designation === "standard";

const designation = fc.oneof(
  { arbitrary: fc.constant<Designation>("standard"), weight: 6 },
  { arbitrary: fc.constant<Designation>("wheelchair"), weight: 1 },
  { arbitrary: fc.constant<Designation>("companion"), weight: 1 },
);

const band = fc.oneof(
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
  fc.array(fc.record({ band, designation, bookable: fc.boolean() }), {
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
          expect(places.slice(1).map((place) => place.cell.band)).not.toContain(
            "aisle",
          );
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

          expect(places.map((place) => place.cell.designation)).toEqual(
            places.map(() => "standard"),
          );
          expect(group.podDividers).toBe(
            places.slice(1).filter((place) => place.cell.band === "pod").length,
          );
        }
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
            const before = placesIn(room, group)[0]?.column ?? 0;
            const after = length - size - before;

            expect(after - before).toBeGreaterThanOrEqual(0);
            expect(after - before).toBeLessThanOrEqual(1);
          }
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

  it("still seats a party once wheelchair and companion Seats are asked for", () => {
    fc.assert(
      fc.property(rooms, partySize, (room, size) => {
        const ordinarily = seatGroupsIn(room.seats, {
          partySize: size,
          accessibleSeating: false,
        });
        const askedFor = seatGroupsIn(room.seats, {
          partySize: size,
          accessibleSeating: true,
        });

        expect(askedFor.length).toBeGreaterThanOrEqual(
          ordinarily.length > 0 ? 1 : 0,
        );
      }),
    );
  });

  it("puts the band boundaries where D37 measured them, and calls an accessible space's own width no console", () => {
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

  it("crosses a console only when no window in the run avoids one", () => {
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
    const room = roomFrom([
      [
        free(),
        cellOf("pod", true, "wheelchair"),
        cellOf("pod", true, "companion"),
        free(),
      ],
    ]);
    const forParty = (size: number, accessibleSeating: boolean) =>
      idsIn(seatGroupsIn(room.seats, { partySize: size, accessibleSeating }));

    expect({
      "a pair, ordinarily": forParty(2, false),
      "one alone, ordinarily": forParty(1, false),
      "a pair, asked for": forParty(2, true),
      "all four, asked for": forParty(4, true),
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
    });
  });

  it("orders Seat Groups from the front row back and along each row, whatever order the Seats arrived in", () => {
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
  it("sorts every in-row gap into D37's three bands, and re-reads an accessible space's width as no console", () => {
    const pairs = inRowPairs(capturedAuditoriums());

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
    const pairs = inRowPairs(auditoriums);
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

  it("offers no wheelchair or companion Seat until a Query asks for one", () => {
    const auditoriums = capturedAuditoriums();
    const accessibleSeatsFor = (accessibleSeating: boolean) =>
      auditoriums
        .flatMap((seats) =>
          seatGroupsIn(seats, { partySize: 2, accessibleSeating }),
        )
        .flatMap((group) => group.seats)
        .filter((seat) => seat.designation !== "standard").length;

    expect({
      ordinarily: accessibleSeatsFor(false),
      askedFor: accessibleSeatsFor(true),
    }).toEqual({ ordinarily: 0, askedFor: 129 });
  });
});
