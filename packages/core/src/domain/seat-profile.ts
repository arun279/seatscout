import type { NormalisedPosition } from "./auditorium.js";
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
  frontBand: 6.97,
};

const mean = (values: readonly number[]) =>
  values
    .toSorted((lower, higher) => lower - higher)
    .reduce((total, value) => total + value, 0) / values.length;

const centroidOf = (
  seats: readonly NormalisedPosition[],
): NormalisedPosition => ({
  depth: mean(seats.map((seat) => seat.depth)),
  lateral: mean(seats.map((seat) => seat.lateral)),
  seatsOffCentre: mean(seats.map((seat) => seat.seatsOffCentre)),
});

export const scoringIn = (
  auditorium: readonly NormalisedPosition[],
  profile: SeatProfile,
): ((group: SeatGroup<NormalisedPosition>) => Scored) => {
  const offsets = auditorium.map((seat) => seat.seatsOffCentre);
  const halfSpanInSeats = (Math.max(...offsets) - Math.min(...offsets)) / 2;
  const depths = [...new Set(auditorium.map((seat) => seat.depth))];
  const rowCount = depths.length;
  const backRow = Math.max(...depths);
  const targetOffCentre = profile.targetLateral * halfSpanInSeats;

  const againstWall = (seat: NormalisedPosition) =>
    seat.depth === backRow ||
    (seat.seatsOffCentre !== 0 &&
      !auditorium.some(
        (other) =>
          other.depth === seat.depth &&
          Math.sign(other.seatsOffCentre) === Math.sign(seat.seatsOffCentre) &&
          Math.abs(other.seatsOffCentre) > Math.abs(seat.seatsOffCentre),
      ));

  return (group) => {
    const position = centroidOf(group.seats);
    const rowsBack = Math.round(position.depth * (rowCount - 1));
    const fromScreen = profile.screenGap + rowsBack * profile.rowPitch;
    const offTarget = Math.abs(position.seatsOffCentre - targetOffCentre);
    const offDepth = Math.abs(position.depth - profile.targetDepth);
    const reasons: RankReasons = {
      rowFromFront: rowsBack + 1,
      rowCount,
      seatsOffCentre: position.seatsOffCentre,
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
