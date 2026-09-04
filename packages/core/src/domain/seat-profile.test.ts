import { describe, expect, it } from "vitest";
import { normalised } from "./auditorium.js";
import type { SeatGroup } from "./seat-group.js";
import {
  type Auditorium,
  alone,
  bestOf,
  drawn,
  type Positioned,
  ROW_GAP,
  rankedIn,
  SEAT_WIDTH,
  scoreOf,
  seatAt,
} from "./seat-profile.fixtures.js";
import {
  type RankReasons,
  REFERENCE,
  type SeatProfile,
  scoringIn,
} from "./seat-profile.js";

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

const named = (auditorium: Auditorium, id: string) => {
  const seat = auditorium.find((candidate) => candidate.id === id);
  if (seat === undefined) throw new Error(`no Seat ${id} in this Auditorium`);
  return seat;
};

const topSeatIn = (auditorium: Auditorium, profile: SeatProfile) =>
  bestOf(rankedIn(auditorium, profile));

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
