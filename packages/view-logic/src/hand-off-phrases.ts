import type { SeatGroupResult } from "@seatscout/client";
import { clockOf, labelOf, lateralOf, partyOf, spokenOf } from "./phrases.js";
import { dayOf } from "./when-phrases.js";

export const BACK_TO_THE_LIST = "Back to the list";

export const RE_CHECKED_THEN_OPENED =
  "Tapping re-checks these seats with the Source, then opens the ticketing page with this showtime selected. seatscout never holds seats.";

export const OFFLINE_AT_HAND_OFF =
  "Offline. Seats are never cached, so this hand-off can be checked when the connection returns.";

export const UNCONFIRMED = "Not confirmed by a second Source";

export const NOTHING_WAS_HELD = "Judged not bookable · nothing was held";

export const NOTHING_WAS_READ = "Nothing was read · nothing was held";

export const NEXT_BEST = "Next best in this room";

export const NEXT_BEST_MARK = "next best";

export const UNREACHABLE = "The Source could not be reached.";

export const CHECK_AGAIN = "Check again";

export const showingOf = (result: SeatGroupResult, today: string): string =>
  [
    `${dayOf(result.terms.date, today)} ${clockOf(result.showtime.startsAt)}`,
    ...result.showtime.presentation.formats,
  ].join(" · ");

export const takeOf = (chosen: SeatGroupResult): string =>
  `Take ${spokenOf(chosen)}`;

export const checkingOf = (chosen: SeatGroupResult): string =>
  `Checking ${spokenOf(chosen)} with the Source`;

export const openingOf = (chosen: SeatGroupResult): string =>
  `Still there. Opening the ticketing page for ${clockOf(chosen.showtime.startsAt)} at ${chosen.showtime.presentation.theater.name}.`;

export const judgedOf = (age: string): string =>
  `1 source · ${age} ago · judged bookable`;

export const recheckedOf = (age: string): string =>
  `Re-checked at hand-off · ${age} ago`;

export const handedOffOf = (age: string): string => `Hand-off · ${age} ago`;

export const wentOf = (lost: SeatGroupResult, replaced: boolean): string =>
  replaced
    ? `${spokenOf(lost)} just went.`
    : `${spokenOf(lost)} just went, and nothing in this room replaces them.`;

export const movedOnOf = (age: string): string =>
  `The Source answered ${age} ago: at least one of them went while you were deciding. seatscout never holds seats, so the room has moved on. The plan is redrawn.`;

export const offNowOf = (age: string, partySize: number): string => {
  const party = partyOf(partySize).toLowerCase();
  return `The Source answered ${age} ago and offered nothing else in this room for ${party}. This screening is no longer on offer to you: sold out, no longer offered by the listing, already begun, off sale, without a seat map, or simply short of ${party}, and the Source does not say which. seatscout never holds seats.`;
};

export const whereTheyWereOf = (lost: SeatGroupResult): string =>
  `where ${labelOf(lost)} were`;

export const placeOf = (alternative: SeatGroupResult): string =>
  `Row ${alternative.reasons.rowFromFront} · ${lateralOf(alternative.reasons.seatsOffCentre)}`;

export const uncheckedOf = (chosen: SeatGroupResult): string =>
  `Nothing was checked, so ${spokenOf(chosen)} may well still be there. A checkout never opens on an answer that could not be judged.`;
