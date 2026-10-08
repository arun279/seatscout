import { type AuditoriumMap, type Place, placeOf } from "@seatscout/core";
import type { SeatGroupResult } from "./ranking.js";

export interface PlacedGroup {
  readonly group: SeatGroupResult;
  readonly place: Place;
}

export interface Auditorium {
  readonly map: AuditoriumMap;
  readonly recommended: PlacedGroup;
  readonly offered: readonly PlacedGroup[];
}

export const placedIn =
  (map: AuditoriumMap) =>
  (group: SeatGroupResult): PlacedGroup => {
    const place = placeOf(map, group.seats);
    if (place === null)
      throw new Error(
        `the Seat Group is not in the room of Showtime ${group.showtime.id}`,
      );
    return { group, place };
  };
