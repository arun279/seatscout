import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  accessibleIn,
  type Band,
  bandBetween,
  cellOf,
  free,
  pairAt,
  partySize,
  type Room,
  roomFrom,
  rooms,
  terms,
} from "./seat-group.fixtures.js";
import { type SeatGroup, seatGroupsIn } from "./seat-group.js";

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
