import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { seatMapCaptures } from "../corpus/captures.js";
import { type Seat, seatsFrom } from "../source/seat-map.js";
import { type NormalisedPosition, normalised } from "./auditorium.js";
import type { SeatGroup } from "./seat-group.js";
import {
  REFERENCE,
  type RankReasons,
  type Scored,
  type SeatProfile,
  scoringIn,
} from "./seat-profile.js";

type Placed = Seat & NormalisedPosition;
type Auditorium = readonly Placed[];

interface RowSpec {
  readonly gap: number;
  readonly pitch: number;
  readonly width: number;
  readonly seats: number;
  readonly shift: number;
}

const FETCHED_AT = 1000;
const SEAT_WIDTH = 10;
const ROW_GAP = 20;

const seatAt = (id: string, x: number, y: number, width: number): Seat => ({
  id,
  designation: "standard",
  bookable: true,
  x,
  y,
  width,
  height: width,
  leftNeighbour: null,
  rightNeighbour: null,
  provenance: {
    source: "aggregator",
    fetchedAt: FETCHED_AT,
    upstreamStatus: "A",
  },
});

const drawn = (rows: readonly RowSpec[]): Auditorium =>
  normalised(
    rows.flatMap((row, index) =>
      Array.from({ length: row.seats }, (_, seat) =>
        seatAt(
          `${index}.${seat}`,
          row.shift -
            ((row.seats - 1) * row.pitch) / 2 +
            seat * row.pitch -
            row.width / 2,
          rows.slice(1, index + 1).reduce((y, above) => y + above.gap, 0),
          row.width,
        ),
      ),
    ),
  );

const evenRoom = (rows: number, seats: number) =>
  drawn(
    Array.from({ length: rows }, () => ({
      gap: ROW_GAP,
      pitch: SEAT_WIDTH,
      width: SEAT_WIDTH,
      seats,
      shift: 0,
    })),
  );

const alone = (seat: Placed): SeatGroup<Placed> => ({
  seats: [seat],
  podDividers: 0,
});

const named = (auditorium: Auditorium, id: string) => {
  const seat = auditorium.find((candidate) => candidate.id === id);
  if (seat === undefined) throw new Error(`no Seat ${id} in this Auditorium`);
  return seat;
};

const scoreOf = (
  auditorium: Auditorium,
  profile: SeatProfile,
  group: SeatGroup<Placed>,
) => scoringIn(auditorium, profile)(group).score;

const everySeatIn = (
  auditorium: Auditorium,
  profile: SeatProfile,
): readonly (Scored & { readonly seat: Placed })[] => {
  const score = scoringIn(auditorium, profile);
  return auditorium.map((seat) => ({ seat, ...score(alone(seat)) }));
};

const rowsIn = (auditorium: Auditorium) =>
  [...new Set(auditorium.map((seat) => seat.depth))]
    .sort((nearer, further) => nearer - further)
    .map((depth) => auditorium.filter((seat) => seat.depth === depth));

const outwardFrom = (row: Auditorium) => [
  row
    .filter((seat) => seat.lateral >= 0)
    .toSorted((left, right) => left.lateral - right.lateral),
  row
    .filter((seat) => seat.lateral <= 0)
    .toSorted((left, right) => right.lateral - left.lateral),
];

const fallsOutward = (auditorium: Auditorium, profile: SeatProfile) => {
  const score = scoringIn(auditorium, profile);
  return rowsIn(auditorium)
    .flatMap(outwardFrom)
    .every((run) =>
      run.every((seat, index) => {
        const inner = run[index - 1];
        return (
          inner === undefined ||
          score(alone(seat)).score <= score(alone(inner)).score + 1e-12
        );
      }),
    );
};

const topSeatIn = (auditorium: Auditorium, profile: SeatProfile) =>
  everySeatIn(auditorium, profile).reduce((best, candidate) =>
    candidate.score > best.score ? candidate : best,
  );

const onTheCentreline = (auditorium: Auditorium, profile: SeatProfile) => {
  const top = topSeatIn(auditorium, profile);
  return (
    Math.abs(top.seat.lateral) ===
    Math.min(
      ...auditorium
        .filter((seat) => seat.depth === top.seat.depth)
        .map((seat) => Math.abs(seat.lateral)),
    )
  );
};

const withinOneRowOfTarget = (auditorium: Auditorium, profile: SeatProfile) => {
  const { reasons } = topSeatIn(auditorium, profile);
  return (
    Math.abs(
      reasons.rowFromFront - (profile.targetDepth * (reasons.rowCount - 1) + 1),
    ) <= 1
  );
};

const capturedAuditoriums = (): readonly Auditorium[] =>
  [...seatMapCaptures.values()].map((capture) => {
    const seats = seatsFrom(JSON.stringify(capture.body), FETCHED_AT);
    if (seats === null)
      throw new Error("the corpus holds a seat map that will not read");
    return normalised(seats);
  });

const rightReachOf = (row: Auditorium) =>
  Math.max(...row.map((seat) => seat.lateral));

const equalOffsetPenalty = (
  auditorium: Auditorium,
  profile: SeatProfile,
  row: Auditorium,
  offset: number,
) => {
  const score = scoringIn(auditorium, profile);
  const [seat] = row;
  if (seat === undefined) throw new Error("an Auditorium row with no Seat");
  const at = (lateral: number) => score(alone({ ...seat, lateral }));
  const centre = at(0);
  const outward = at(offset);
  expect(outward.reasons.againstWall).toBe(centre.reasons.againstWall);
  return centre.score - outward.score;
};

const punishesTheFrontRowHarder = (
  auditorium: Auditorium,
  profile: SeatProfile,
) => {
  const rows = rowsIn(auditorium);
  const front = rows.at(0);
  const back = rows.at(-1);
  if (front === undefined || back === undefined || front === back) return null;
  const offset = Math.min(rightReachOf(front), rightReachOf(back)) / 2;
  if (offset <= 0) return null;
  return (
    equalOffsetPenalty(auditorium, profile, front, offset) >
    equalOffsetPenalty(auditorium, profile, back, offset) + 1e-9
  );
};

const SEPARABLE: SeatProfile = { ...REFERENCE, rowPitch: 0 };

const rowSpecs = fc.record({
  gap: fc.integer({ min: 1, max: 40 }),
  pitch: fc.integer({ min: 0, max: 30 }),
  width: fc.integer({ min: 1, max: 20 }),
  seats: fc.integer({ min: 1, max: 12 }),
  shift: fc.integer({ min: -30, max: 30 }),
});

const tapered = (direction: number) =>
  fc.tuple(rowSpecs, fc.integer({ min: 2, max: 9 })).map(([base, rows]) =>
    Array.from({ length: rows }, (_, index) => ({
      ...base,
      seats: Math.max(1, base.seats + direction * index * 2),
    })),
  );

const layouts = fc.oneof(
  {
    weight: 1,
    arbitrary: rowSpecs.map((row) => [{ ...row, seats: 1 }]),
  },
  { weight: 1, arbitrary: fc.array(rowSpecs, { minLength: 1, maxLength: 1 }) },
  { weight: 3, arbitrary: tapered(1) },
  { weight: 3, arbitrary: tapered(-1) },
  { weight: 3, arbitrary: fc.array(rowSpecs, { minLength: 2, maxLength: 9 }) },
);

const auditoriums = layouts.map(drawn).chain((seats) =>
  fc.shuffledSubarray([...seats], {
    minLength: seats.length,
    maxLength: seats.length,
  }),
);

const sweptWeightings = () =>
  [0.25, 1, 2].flatMap((depthWeight) =>
    [0.25, 1, 2].flatMap((offAxisWeight) =>
      [0, 0.25].flatMap((frontBandWeight) =>
        [0, 0.25].flatMap((wallBandWeight) =>
          [6, 24].map((screenGap) => ({
            depthWeight,
            offAxisWeight,
            frontBandWeight,
            wallBandWeight,
            screenGap,
          })),
        ),
      ),
    ),
  );

const weightings = fc.record({
  depthWeight: fc.constantFrom(0.25, 1, 2),
  offAxisWeight: fc.constantFrom(0.25, 1, 2),
  frontBandWeight: fc.constantFrom(0, 0.25),
  wallBandWeight: fc.constantFrom(0, 0.25),
  screenGap: fc.constantFrom(6, 24),
});

const acrossTheSweep = (
  captured: readonly Auditorium[],
  grid: readonly Partial<SeatProfile>[],
) => {
  const judgements = grid.flatMap((weights) =>
    captured.map((room) => {
      const profile = { ...REFERENCE, ...weights };
      return {
        profile,
        centreline: onTheCentreline(room, profile),
        outward: fallsOutward(room, profile),
        onTargetRow: withinOneRowOfTarget(room, profile),
      };
    }),
  );
  const offTargetRow = judgements.filter((judgement) => !judgement.onTargetRow);
  return {
    points: judgements.length,
    centreline: judgements.filter((judgement) => judgement.centreline).length,
    outward: judgements.filter((judgement) => judgement.outward).length,
    offTargetRow: offTargetRow.length,
    offTargetRowWhereDepthLeads: offTargetRow.filter(
      ({ profile }) => profile.depthWeight >= profile.offAxisWeight,
    ).length,
  };
};

const shapeOf = (rows: readonly Auditorium[]) => {
  const width = (row: Auditorium) =>
    Math.max(...row.map((seat) => seat.lateral)) -
    Math.min(...row.map((seat) => seat.lateral));
  const front = rows.at(0);
  const back = rows.at(-1);
  if (front === undefined || back === undefined) return "empty";
  if (rows.length === 1) return "oneRow";
  if (width(back) > width(front)) return "widens";
  if (width(back) < width(front)) return "narrows";
  return "equal";
};

describe("the Reference Seat Profile over the captured corpus", () => {
  it("puts its best Seat on the centreline within one row of the reference row, and falls away outward", () => {
    const captured = capturedAuditoriums();

    expect({
      auditoriums: captured.length,
      onTheCentreline: captured.filter((room) =>
        onTheCentreline(room, REFERENCE),
      ).length,
      withinOneRowOfTarget: captured.filter((room) =>
        withinOneRowOfTarget(room, REFERENCE),
      ).length,
      fallingOutward: captured.filter((room) => fallsOutward(room, REFERENCE))
        .length,
    }).toEqual({
      auditoriums: 42,
      onTheCentreline: 42,
      withinOneRowOfTarget: 42,
      fallingOutward: 42,
    });
  });

  it("punishes the same lateral offset harder in the front row than in the last, which the separable form it replaces does in none", () => {
    const captured = capturedAuditoriums();
    const holding = (profile: SeatProfile) =>
      captured.filter(
        (room) => punishesTheFrontRowHarder(room, profile) === true,
      ).length;

    expect(
      Object.fromEntries(
        [6, 9, 12, 16, 20, 24, 32, 48].map((screenGap) => [
          `angular, screen gap ${screenGap}`,
          holding({ ...REFERENCE, screenGap }),
        ]),
      ),
    ).toEqual({
      "angular, screen gap 6": 42,
      "angular, screen gap 9": 42,
      "angular, screen gap 12": 42,
      "angular, screen gap 16": 42,
      "angular, screen gap 20": 42,
      "angular, screen gap 24": 42,
      "angular, screen gap 32": 42,
      "angular, screen gap 48": 42,
    });
    expect(holding(SEPARABLE)).toBe(0);
  });

  it("keeps that ranking across the weightings and screen gaps the prototype swept", () => {
    expect(acrossTheSweep(capturedAuditoriums(), sweptWeightings())).toEqual({
      points: 72 * 42,
      centreline: 72 * 42,
      outward: 72 * 42,
      offTargetRow: 12,
      offTargetRowWhereDepthLeads: 0,
    });
  });
});

describe("the Seat Profile score", () => {
  it("charges each penalty on its own, and nothing when its weight is zero", () => {
    const unweighted: SeatProfile = {
      ...REFERENCE,
      depthWeight: 0,
      offAxisWeight: 0,
      frontBandWeight: 0,
      wallBandWeight: 0,
      podDividerWeight: 0,
    };
    const room = evenRoom(5, 7);
    const middle = named(room, "3.3");
    const charged = (profile: Partial<SeatProfile>, group: SeatGroup<Placed>) =>
      scoreOf(room, { ...unweighted, ...profile }, group);

    expect({
      nothing: charged({}, alone(middle)),
      depth: charged({ depthWeight: 1 }, alone(middle)),
      offAxis: charged({ offAxisWeight: 1 }, alone(named(room, "3.6"))),
      onAxis: charged({ offAxisWeight: 1 }, alone(middle)),
      front: charged({ frontBandWeight: 1 }, alone(named(room, "0.3"))),
      behindTheFrontBand: charged({ frontBandWeight: 1 }, alone(middle)),
      backWall: charged({ wallBandWeight: 1 }, alone(named(room, "4.3"))),
      sideWall: charged({ wallBandWeight: 1 }, alone(named(room, "3.6"))),
      offTheWall: charged({ wallBandWeight: 1 }, alone(middle)),
      consoles: charged(
        { podDividerWeight: 1 },
        { seats: [middle], podDividers: 2 },
      ),
    }).toEqual({
      nothing: 0,
      depth: 0 - Math.abs(0.75 - REFERENCE.targetDepth),
      offAxis: 0 - 3 / (REFERENCE.screenGap + 3 * REFERENCE.rowPitch),
      onAxis: 0,
      front: -1,
      behindTheFrontBand: 0,
      backWall: -1,
      sideWall: -1,
      offTheWall: 0,
      consoles: -2,
    });
  });

  it("adds the penalties it charges rather than choosing between them", () => {
    const room = evenRoom(4, 5);
    const corner = alone(named(room, "0.0"));
    const only = (profile: Partial<SeatProfile>) =>
      scoreOf(room, { ...REFERENCE, ...profile }, corner);
    const zeroed = {
      depthWeight: 0,
      offAxisWeight: 0,
      frontBandWeight: 0,
      wallBandWeight: 0,
    };

    expect(only({})).toBeCloseTo(
      only({ ...zeroed, depthWeight: REFERENCE.depthWeight }) +
        only({ ...zeroed, offAxisWeight: REFERENCE.offAxisWeight }) +
        only({ ...zeroed, frontBandWeight: REFERENCE.frontBandWeight }) +
        only({ ...zeroed, wallBandWeight: REFERENCE.wallBandWeight }),
      12,
    );
  });

  it("puts the front band exactly where the Profile's distance to the screen puts it", () => {
    const room = evenRoom(6, 3);
    const inBand = (profile: Partial<SeatProfile>, row: number) =>
      scoringIn(room, { ...REFERENCE, ...profile })(
        alone(named(room, `${row}.1`)),
      ).reasons.inFrontBand;
    const band = REFERENCE.screenGap + 2 * REFERENCE.rowPitch;

    expect({
      thirdRowJustInside: inBand({ frontBand: band + 1e-9 }, 2),
      thirdRowExactly: inBand({ frontBand: band }, 2),
      fourthRowAtTheSameBand: inBand({ frontBand: band + 1e-9 }, 3),
      frontRowUnderReference: inBand({}, 0),
      lastRowUnderReference: inBand({}, 5),
    }).toEqual({
      thirdRowJustInside: true,
      thirdRowExactly: false,
      fourthRowAtTheSameBand: false,
      frontRowUnderReference: true,
      lastRowUnderReference: false,
    });
  });

  it("calls a Seat tied when it is within half a row and one seat of the target, and not a step beyond either", () => {
    const room = evenRoom(5, 9);
    const tied = (profile: Partial<SeatProfile>, id: string) =>
      scoringIn(room, { ...REFERENCE, ...profile })(alone(named(room, id)))
        .reasons.tiedAtRoomResolution;
    const onTarget = { targetDepth: 0.5, targetLateral: 0 };

    expect({
      onIt: tied(onTarget, "2.4"),
      halfARowAway: tied({ ...onTarget, targetDepth: 0.5 - 0.5 / 4 }, "2.4"),
      pastHalfARow: tied({ ...onTarget, targetDepth: 0.5 - 0.51 / 4 }, "2.4"),
      oneSeatAway: tied(onTarget, "2.5"),
      pastOneSeat: tied(onTarget, "2.6"),
      aRowAway: tied(onTarget, "3.4"),
    }).toEqual({
      onIt: true,
      halfARowAway: true,
      pastHalfARow: false,
      oneSeatAway: true,
      pastOneSeat: false,
      aRowAway: false,
    });
  });

  it("measures a Seat Group from its centroid and says which row it is in, counting rows rather than dividing depths", () => {
    const room = evenRoom(10, 8);
    const group: SeatGroup<Placed> = {
      seats: [named(room, "7.2"), named(room, "7.3"), named(room, "7.4")],
      podDividers: 1,
    };
    const expected: RankReasons = {
      rowFromFront: 8,
      rowCount: 10,
      seatsOffCentre: -0.5,
      inFrontBand: false,
      againstWall: false,
      tiedAtRoomResolution: false,
    };
    const { position, reasons } = scoringIn(room, REFERENCE)(group);

    expect({ position, reasons }).toEqual({
      position: { depth: 7 / 9, lateral: -0.14285714285714285 },
      reasons: expected,
    });
  });

  it("says what it says with named reasons and one number, and never a rank", () => {
    const room = evenRoom(3, 3);
    const scored = scoringIn(room, REFERENCE)(alone(named(room, "1.1")));

    expect(Object.keys(scored).toSorted()).toEqual([
      "position",
      "reasons",
      "score",
    ]);
    expect(Object.keys(scored.reasons).toSorted()).toEqual([
      "againstWall",
      "inFrontBand",
      "rowCount",
      "rowFromFront",
      "seatsOffCentre",
      "tiedAtRoomResolution",
    ]);
  });

  it("targets two thirds back on the centreline until the Profile says otherwise", () => {
    const room = evenRoom(7, 9);
    const bestUnder = (profile: Partial<SeatProfile>) =>
      topSeatIn(room, { ...REFERENCE, ...profile }).seat.id;

    expect({
      reference: bestUnder({}),
      targets: [REFERENCE.targetDepth, REFERENCE.targetLateral],
      halfway: bestUnder({ targetDepth: 0.5 }),
      atTheFront: bestUnder({ targetDepth: 0, wallBandWeight: 0 }),
      offToTheLeft: bestUnder({ targetLateral: -1, offAxisWeight: 4 }),
    }).toEqual({
      reference: "4.4",
      targets: [0.67, 0],
      halfway: "3.4",
      atTheFront: "0.4",
      offToTheLeft: "4.0",
    });
  });
});

describe("the Seat Profile score over generated Auditoriums", () => {
  it("is the same score however the Seats arrived", () => {
    fc.assert(
      fc.property(
        auditoriums,
        fc.integer({ min: 1, max: 4 }),
        (seats, size) => {
          const room = normalised(seats);
          const group = room.slice(0, size);
          const shuffled = [...room].reverse();

          expect(
            scoreOf(shuffled, REFERENCE, {
              seats: [...group].reverse(),
              podDividers: 0,
            }),
          ).toBe(scoreOf(room, REFERENCE, { seats: group, podDividers: 0 }));
        },
      ),
      { numRuns: 300 },
    );
  });

  it("punishes the same lateral offset harder the nearer the screen, whether the room widens or narrows toward the back", () => {
    const shapes = { widens: 0, narrows: 0, equal: 0, oneRow: 0, empty: 0 };

    fc.assert(
      fc.property(auditoriums, weightings, (seats, weights) => {
        const room = normalised(seats);
        const rows = rowsIn(room);
        shapes[shapeOf(rows)] += 1;

        expect(
          punishesTheFrontRowHarder(room, { ...REFERENCE, ...weights }),
        ).not.toBe(false);
      }),
      { numRuns: 400 },
    );

    expect(shapes.widens).toBeGreaterThan(0);
    expect(shapes.narrows).toBeGreaterThan(0);
    expect(shapes.oneRow).toBeGreaterThan(0);
  });

  it("is separable the moment the rows stop standing at different distances, and then satisfies that in nothing", () => {
    const rooms = fc.sample(auditoriums, { numRuns: 200, seed: 21 });
    const holding = (profile: SeatProfile) =>
      rooms.filter(
        (seats) =>
          punishesTheFrontRowHarder(normalised(seats), profile) === true,
      ).length;

    expect(holding(REFERENCE)).toBeGreaterThan(0);
    expect(holding(SEPARABLE)).toBe(0);
  });

  it("charges more for the same Seat the further it sits from the centreline of its row", () => {
    fc.assert(
      fc.property(auditoriums, weightings, (seats, weights) => {
        expect(
          fallsOutward(normalised(seats), {
            ...REFERENCE,
            ...weights,
            wallBandWeight: 0,
          }),
        ).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  it("counts rows from the front, one to the room's own count, and reads the centreline off the room", () => {
    const shapes = { oneSeat: 0, manySeats: 0 };

    fc.assert(
      fc.property(auditoriums, (seats) => {
        const room = normalised(seats);
        const score = scoringIn(room, REFERENCE);
        const rows = rowsIn(room);

        if (room.length === 1) shapes.oneSeat += 1;
        else shapes.manySeats += 1;

        for (const [index, row] of rows.entries())
          for (const seat of row) {
            const { reasons } = score(alone(seat));

            expect(reasons.rowFromFront).toBe(index + 1);
            expect(reasons.rowCount).toBe(rows.length);
            expect(Math.sign(reasons.seatsOffCentre)).toBe(
              Math.sign(seat.lateral),
            );
          }
      }),
      { numRuns: 300 },
    );

    expect(shapes.oneSeat).toBeGreaterThan(0);
    expect(shapes.manySeats).toBeGreaterThan(0);
  });

  it("calls a Seat against a wall when its row has nothing beyond it, and every Seat of the last row", () => {
    fc.assert(
      fc.property(auditoriums, (seats) => {
        const room = normalised(seats);
        const score = scoringIn(room, REFERENCE);
        const rows = rowsIn(room);
        const back = rows.at(-1);

        for (const row of rows)
          for (const seat of row)
            expect(score(alone(seat)).reasons.againstWall).toBe(
              row === back ||
                seat.lateral ===
                  (seat.lateral < 0
                    ? Math.min(...row.map((one) => one.lateral))
                    : Math.max(...row.map((one) => one.lateral))),
            );
      }),
      { numRuns: 300 },
    );
  });

  it("charges a Seat Group for every console it crosses and for nothing else it did not cross", () => {
    fc.assert(
      fc.property(
        auditoriums,
        fc.integer({ min: 0, max: 4 }),
        (seats, podDividers) => {
          const room = normalised(seats);
          const [seat] = room;
          if (seat === undefined) return;
          const of = (crossed: number) =>
            scoreOf(room, REFERENCE, { seats: [seat], podDividers: crossed });

          expect(of(podDividers)).toBeCloseTo(
            of(0) - REFERENCE.podDividerWeight * podDividers,
            12,
          );
        },
      ),
      { numRuns: 300 },
    );
  });
});
