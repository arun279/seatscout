import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { seatMapCaptures } from "../corpus/captures.js";
import type { CapturedSeatMap } from "../corpus/types.js";
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

type Positioned = Seat & NormalisedPosition;
type Auditorium = readonly Positioned[];

interface RowSpec {
  readonly gap: number;
  readonly pitch: number;
  readonly width: number;
  readonly seats: number;
  readonly shift: number;
}

const FETCHED_AT = 1000;
const BENCHMARK_AUDITORIUMS: readonly string[] = [
  "561443587",
  "561462741",
  "561505814",
  "561230736",
  "561865199",
];
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

const rowOf = (seats: number, shift = 0, width = SEAT_WIDTH): RowSpec => ({
  gap: ROW_GAP,
  pitch: SEAT_WIDTH,
  width,
  seats,
  shift,
});

const shapedRooms = (): readonly Auditorium[] => [
  drawn([rowOf(4), rowOf(6), rowOf(8)]),
  drawn([rowOf(8), rowOf(6), rowOf(4)]),
  drawn([rowOf(6), rowOf(6), rowOf(6)]),
  drawn([rowOf(6, -15), rowOf(6, 0), rowOf(6, 15)]),
  drawn([
    { ...rowOf(6), gap: 5 },
    { ...rowOf(7), gap: 90 },
    { ...rowOf(5), gap: 20 },
  ]),
  drawn([rowOf(6, 0, 4), rowOf(5, 0, 12), rowOf(7, 0, 9)]),
];

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

const alone = (seat: Positioned): SeatGroup<Positioned> => ({
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
  group: SeatGroup<Positioned>,
) => scoringIn(auditorium, profile)(group).score;

interface Ranked extends Scored {
  readonly seat: Positioned;
}

const rankedIn = (
  auditorium: Auditorium,
  profile: SeatProfile,
): readonly Ranked[] => {
  const score = scoringIn(auditorium, profile);
  return auditorium.map((seat) => ({ seat, ...score(alone(seat)) }));
};

const bestOf = (ranked: readonly Ranked[]) =>
  ranked.reduce((best, candidate) =>
    candidate.score > best.score ? candidate : best,
  );

const topSeatIn = (auditorium: Auditorium, profile: SeatProfile) =>
  bestOf(rankedIn(auditorium, profile));

const rowsIn = (auditorium: Auditorium) =>
  [...new Set(auditorium.map((seat) => seat.depth))]
    .sort((nearer, further) => nearer - further)
    .map((depth) => auditorium.filter((seat) => seat.depth === depth));

const sidesOf = (row: Auditorium) =>
  [
    row.filter((seat) => seat.seatsOffCentre > 0),
    row.filter((seat) => seat.seatsOffCentre < 0),
  ].filter((side) => side.length > 0);

const farEdgeOf = (side: Auditorium) => {
  const edge = Math.max(...side.map((seat) => Math.abs(seat.seatsOffCentre)));
  return side.filter((seat) => Math.abs(seat.seatsOffCentre) === edge);
};

const outwardRuns = (ranked: readonly Ranked[]) =>
  [...new Set(ranked.map((one) => one.seat.depth))].flatMap((depth) => {
    const row = ranked.filter((one) => one.seat.depth === depth);
    return [
      row
        .filter((one) => one.seat.seatsOffCentre >= 0)
        .toSorted(
          (left, right) => left.seat.seatsOffCentre - right.seat.seatsOffCentre,
        ),
      row
        .filter((one) => one.seat.seatsOffCentre <= 0)
        .toSorted(
          (left, right) => right.seat.seatsOffCentre - left.seat.seatsOffCentre,
        ),
    ];
  });

const judged = (auditorium: Auditorium, profile: SeatProfile) => {
  const ranked = rankedIn(auditorium, profile);
  const top = bestOf(ranked);
  return {
    onTheCentreline:
      Math.abs(top.seat.seatsOffCentre) ===
      Math.min(
        ...ranked
          .filter((one) => one.seat.depth === top.seat.depth)
          .map((one) => Math.abs(one.seat.seatsOffCentre)),
      ),
    withinOneRowOfTarget:
      Math.abs(
        top.reasons.rowFromFront -
          (profile.targetDepth * (top.reasons.rowCount - 1) + 1),
      ) <= 1,
    fallingOutward: outwardRuns(ranked).every((run) =>
      run.every((one, index) => {
        const inner = run[index - 1];
        return inner === undefined || one.score <= inner.score + 1e-12;
      }),
    ),
  };
};

const auditoriumOf = (body: CapturedSeatMap): Auditorium => {
  const seats = seatsFrom(JSON.stringify(body), FETCHED_AT);
  if (seats === null)
    throw new Error("the corpus holds a seat map that will not read");
  return normalised(seats);
};

const capturedAuditoriums = (): readonly Auditorium[] =>
  [...seatMapCaptures.values()].map((capture) => auditoriumOf(capture.body));

const benchmarkAuditoriums = (): readonly Auditorium[] =>
  [...seatMapCaptures.values()]
    .filter((capture) =>
      BENCHMARK_AUDITORIUMS.includes(capture.body.showtimeId),
    )
    .map((capture) => auditoriumOf(capture.body));

const rightReachOf = (row: Auditorium) =>
  Math.max(...row.map((seat) => seat.seatsOffCentre));

const equalOffsetPenalty = (
  auditorium: Auditorium,
  profile: SeatProfile,
  row: Auditorium,
  offset: number,
) => {
  const score = scoringIn(auditorium, profile);
  const [seat] = row;
  if (seat === undefined) throw new Error("an Auditorium row with no Seat");
  const at = (seatsOffCentre: number) =>
    score(alone({ ...seat, seatsOffCentre }));
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
          [6, 24].flatMap((screenGap) =>
            [1, 2.3].map((rowPitch) => ({
              depthWeight,
              offAxisWeight,
              frontBandWeight,
              wallBandWeight,
              screenGap,
              rowPitch,
            })),
          ),
        ),
      ),
    ),
  );

const weightings = fc.constantFrom(...sweptWeightings());

const acrossTheSweep = (
  rooms: readonly Auditorium[],
  grid: readonly Partial<SeatProfile>[],
) => {
  const judgements = grid.flatMap((weights) =>
    rooms.map((room) => {
      const profile = { ...REFERENCE, ...weights };
      return { profile, ...judged(room, profile) };
    }),
  );
  const offTargetRow = judgements.filter(
    (judgement) => !judgement.withinOneRowOfTarget,
  );
  return {
    points: judgements.length,
    centreline: judgements.filter((judgement) => judgement.onTheCentreline)
      .length,
    outward: judgements.filter((judgement) => judgement.fallingOutward).length,
    offTargetRow: offTargetRow.length,
    offTargetRowWhereDepthLeads: offTargetRow.filter(
      ({ profile }) => profile.depthWeight >= profile.offAxisWeight,
    ).length,
  };
};

const shapeOf = (rows: readonly Auditorium[]) => {
  const spreads = rows.map(
    (row) =>
      Math.max(...row.map((seat) => seat.lateral)) -
      Math.min(...row.map((seat) => seat.lateral)),
  );
  const front = Math.max(...spreads.slice(0, 1));
  const back = Math.max(...spreads.slice(-1));
  if (rows.length === 1) return "oneRow";
  if (back > front) return "widens";
  if (back < front) return "narrows";
  return "equal";
};

describe("the Reference Seat Profile over the captured corpus", () => {
  it("puts its best Seat on the centreline within one row of the reference row, and falls away outward", () => {
    const captured = capturedAuditoriums().map((room) =>
      judged(room, REFERENCE),
    );

    expect({
      auditoriums: captured.length,
      onTheCentreline: captured.filter((room) => room.onTheCentreline).length,
      withinOneRowOfTarget: captured.filter((room) => room.withinOneRowOfTarget)
        .length,
      fallingOutward: captured.filter((room) => room.fallingOutward).length,
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

  it("keeps that ranking across a sweep of every weight and both modelled distances", () => {
    expect(acrossTheSweep(benchmarkAuditoriums(), sweptWeightings())).toEqual({
      points: 144 * 5,
      centreline: 144 * 5,
      outward: 144 * 5,
      offTargetRow: 0,
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
    const charged = (
      profile: Partial<SeatProfile>,
      group: SeatGroup<Positioned>,
    ) => scoreOf(room, { ...unweighted, ...profile }, group);

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
      aGroupReachingTheWall: charged(
        { wallBandWeight: 1 },
        { seats: [named(room, "3.5"), named(room, "3.6")], podDividers: 0 },
      ),
      aGroupClearOfIt: charged(
        { wallBandWeight: 1 },
        { seats: [named(room, "3.4"), named(room, "3.5")], podDividers: 0 },
      ),
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
      aGroupReachingTheWall: -1,
      aGroupClearOfIt: 0,
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
    const room = evenRoom(11, 8);
    const group: SeatGroup<Positioned> = {
      seats: [named(room, "7.2"), named(room, "7.3"), named(room, "7.4")],
      podDividers: 1,
    };
    const expected: RankReasons = {
      rowFromFront: 8,
      rowCount: 11,
      seatsOffCentre: -0.5,
      inFrontBand: false,
      againstWall: false,
      tiedAtRoomResolution: true,
    };
    const { position, reasons } = scoringIn(room, REFERENCE)(group);

    expect(reasons).toEqual(expected);
    expect(position.depth).toBeCloseTo(0.7, 15);
    expect(position.lateral).toBeCloseTo(-1 / 7, 15);
  });

  it("targets two thirds back on the centreline until the Profile says otherwise", () => {
    const room = evenRoom(7, 9);
    const bestUnder = (profile: Partial<SeatProfile>) =>
      topSeatIn(room, { ...REFERENCE, ...profile }).seat.id;

    expect({
      reference: bestUnder({}),
      targets: [REFERENCE.targetDepth, REFERENCE.targetLateral],
      halfway: bestUnder({ targetDepth: 0.5 }),
      atTheFrontRow: bestUnder({ targetDepth: 0, wallBandWeight: 0 }),
      atTheFrontRowWithNoBand: bestUnder({
        targetDepth: 0,
        wallBandWeight: 0,
        frontBandWeight: 0,
      }),
      offToTheLeft: bestUnder({ targetLateral: -1, offAxisWeight: 4 }),
    }).toEqual({
      reference: "4.4",
      targets: [0.67, 0],
      halfway: "3.4",
      atTheFrontRow: "1.4",
      atTheFrontRowWithNoBand: "0.4",
      offToTheLeft: "4.0",
    });
  });

  it("puts the target lateral on the room's own half span, counted in seat widths", () => {
    const room = normalised([
      seatAt("wide", 0, 0, 100),
      seatAt("near", 200, 0, 10),
      seatAt("mid", 240, 0, 10),
      seatAt("far", 300, 0, 10),
    ]);
    const bestUnder = (targetLateral: number) =>
      topSeatIn(room, { ...REFERENCE, targetLateral }).seat.id;

    expect({
      onTheCentreline: bestUnder(0),
      halfWayOut: bestUnder(0.5),
      atTheEdge: bestUnder(1),
    }).toEqual({
      onTheCentreline: "wide",
      halfWayOut: "near",
      atTheEdge: "mid",
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
    const shapes = { widens: 0, narrows: 0, equal: 0, oneRow: 0 };
    const outcomes = { held: 0, nothingToCompare: 0 };

    fc.assert(
      fc.property(auditoriums, weightings, (seats, weights) => {
        const room = normalised(seats);
        const held = punishesTheFrontRowHarder(room, {
          ...REFERENCE,
          ...weights,
        });
        shapes[shapeOf(rowsIn(room))] += 1;
        outcomes[held === null ? "nothingToCompare" : "held"] += 1;

        expect(held).not.toBe(false);
      }),
      { numRuns: 400 },
    );

    expect(shapes.widens).toBeGreaterThan(0);
    expect(shapes.narrows).toBeGreaterThan(0);
    expect(shapes.equal).toBeGreaterThan(0);
    expect(shapes.oneRow).toBeGreaterThan(0);
    expect(outcomes.held).toBeGreaterThan(0);
  });

  it("holds that in every shape of room, and once the rows stand at one distance the same score holds it in none", () => {
    const rooms = shapedRooms();
    const holding = (profile: SeatProfile) =>
      rooms.filter((room) => punishesTheFrontRowHarder(room, profile) === true)
        .length;

    expect({
      rooms: rooms.length,
      angular: holding(REFERENCE),
      separable: holding(SEPARABLE),
    }).toEqual({ rooms: 6, angular: 6, separable: 0 });
  });

  it("charges more for the same Seat the further it sits from the centreline of its row", () => {
    fc.assert(
      fc.property(auditoriums, weightings, (seats, weights) => {
        expect(
          judged(normalised(seats), {
            ...REFERENCE,
            ...weights,
            wallBandWeight: 0,
          }).fallingOutward,
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
            expect(reasons.seatsOffCentre).toBe(seat.seatsOffCentre);
          }
      }),
      { numRuns: 300 },
    );

    expect(shapes.oneSeat).toBeGreaterThan(0);
    expect(shapes.manySeats).toBeGreaterThan(0);
  });

  it("puts the whole last row against a wall, and elsewhere only the Seats at the far edge of a side", () => {
    fc.assert(
      fc.property(auditoriums, (seats) => {
        const room = normalised(seats);
        const score = scoringIn(room, REFERENCE);
        const rows = rowsIn(room);
        const walled = (row: Auditorium) =>
          row.filter((seat) => score(alone(seat)).reasons.againstWall);

        for (const row of rows.slice(-1)) expect(walled(row)).toEqual(row);
        for (const row of rows.slice(0, -1)) {
          expect(
            walled(row.filter((seat) => seat.seatsOffCentre === 0)),
          ).toEqual([]);
          for (const side of sidesOf(row))
            expect(walled(side)).toEqual(farEdgeOf(side));
        }
      }),
      { numRuns: 300 },
    );
  });

  it("mirrors which Seats are against a wall when the Auditorium is drawn mirrored", () => {
    fc.assert(
      fc.property(
        auditoriums,
        fc.integer({ min: -500, max: 500 }),
        (seats, axis) => {
          const walled = (room: Auditorium) => {
            const score = scoringIn(room, REFERENCE);
            return room.map((seat) => score(alone(seat)).reasons.againstWall);
          };

          expect(
            walled(
              normalised(
                seats.map((seat) => ({
                  ...seat,
                  x: axis - seat.x - seat.width,
                })),
              ),
            ),
          ).toEqual(walled(normalised(seats)));
        },
      ),
      { numRuns: 300 },
    );
  });

  it("ranks the same Seats below themselves for every console they turn out to cross", () => {
    fc.assert(
      fc.property(
        auditoriums,
        fc.integer({ min: 1, max: 4 }),
        (seats, podDividers) => {
          const room = normalised(seats);
          const group = room.slice(0, 3);
          const of = (crossed: number) =>
            scoreOf(room, REFERENCE, { seats: group, podDividers: crossed });

          expect(of(podDividers)).toBeLessThan(of(podDividers - 1));
        },
      ),
      { numRuns: 300 },
    );
  });
});
