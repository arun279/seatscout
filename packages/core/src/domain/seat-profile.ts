import type { NormalisedPosition, Placement } from "./auditorium.js";
import type { SeatGroup } from "./seat-group.js";

export interface SeatProfile {
  readonly targetDepth: number;
  readonly targetLateral: number;
  readonly depthWeight: number;
  readonly offAxisWeight: number;
  readonly frontBandWeight: number;
  readonly wallBandWeight: number;
  readonly podDividerWeight: number;
  readonly screenGap: number;
  readonly rowPitch: number;
  readonly frontBand: number;
}

export interface RankReasons {
  readonly rowFromFront: number;
  readonly rowCount: number;
  readonly seatsOffCentre: number;
  readonly inFrontBand: boolean;
  readonly againstWall: boolean;
  readonly tiedAtRoomResolution: boolean;
}

export interface Scored {
  readonly score: number;
  readonly position: NormalisedPosition;
  readonly reasons: RankReasons;
}

export const REFERENCE: SeatProfile = {
  targetDepth: 0.67,
  targetLateral: 0,
  depthWeight: 1,
  offAxisWeight: 1,
  frontBandWeight: 0.25,
  wallBandWeight: 0.25,
  podDividerWeight: 0.25,
  screenGap: 6,
  rowPitch: 1.71,
  frontBand: 9.6,
};

type Placed = Placement & NormalisedPosition;

const mean = (values: readonly number[]) =>
  values
    .toSorted((lower, higher) => lower - higher)
    .reduce((total, value) => total + value, 0) / values.length;

const centroidOf = (
  seats: readonly NormalisedPosition[],
): NormalisedPosition => ({
  depth: mean(seats.map((seat) => seat.depth)),
  lateral: mean(seats.map((seat) => seat.lateral)),
});

export const scoringIn = <T extends Placed>(
  auditorium: readonly T[],
  profile: SeatProfile,
): ((group: SeatGroup<T>) => Scored) => {
  const centres = auditorium.map((seat) => seat.x + seat.width / 2);
  const halfSpanInSeats =
    (Math.max(...centres) - Math.min(...centres)) /
    2 /
    mean(auditorium.map((seat) => seat.width));
  const depths = [...new Set(auditorium.map((seat) => seat.depth))];
  const rowCount = depths.length;
  const backRow = Math.max(...depths);
  const targetOffCentre = profile.targetLateral * halfSpanInSeats;

  const againstWall = (seat: Placed) =>
    seat.depth === backRow ||
    !auditorium.some(
      (other) =>
        other.depth === seat.depth &&
        (seat.lateral < 0
          ? other.lateral < seat.lateral
          : other.lateral > seat.lateral),
    );

  return (group) => {
    const position = centroidOf(group.seats);
    const rowsBack = Math.round(position.depth * (rowCount - 1));
    const fromScreen = profile.screenGap + rowsBack * profile.rowPitch;
    const offCentre = position.lateral * halfSpanInSeats;
    const offTarget = Math.abs(offCentre - targetOffCentre);
    const offDepth = Math.abs(position.depth - profile.targetDepth);
    const reasons: RankReasons = {
      rowFromFront: rowsBack + 1,
      rowCount,
      seatsOffCentre: offCentre,
      inFrontBand: fromScreen < profile.frontBand,
      againstWall: group.seats.some(againstWall),
      tiedAtRoomResolution: offDepth * (rowCount - 1) <= 0.5 && offTarget <= 1,
    };
    return {
      score:
        0 -
        (profile.depthWeight * offDepth +
          (profile.offAxisWeight * offTarget) / fromScreen +
          (reasons.inFrontBand ? profile.frontBandWeight : 0) +
          (reasons.againstWall ? profile.wallBandWeight : 0) +
          profile.podDividerWeight * group.podDividers),
      position,
      reasons,
    };
  };
};
