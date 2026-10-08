import type { SeatGroupResult } from "@seatscout/client";
import {
  agreementOf,
  clockOf,
  labelOf,
  lateralOf,
  partyOf,
  spokenOf,
} from "./phrases.js";
import { dayOf } from "./when-phrases.js";

export const BACK_TO_THE_LIST = "Back to the list";

export const RE_CHECKED_THEN_OPENED =
  "Tapping re-checks these seats, then opens the ticket site at this showtime. SeatScout never holds seats.";

export const OFFLINE_AT_HAND_OFF =
  "Offline. Seats are never cached, so this hand-off can be checked when the connection returns.";

export const UNCONFIRMED = "Only the ticket site says so";

export const MOVED_ON =
  "SeatScout never holds seats, so others can take them while you decide.";

export const NEXT_BEST = "Next best in this room";

export const NEXT_BEST_MARK = "next best";

export const UNREACHABLE = "The ticket site could not be reached.";

export const CHECK_AGAIN = "Check again";

export const showingOf = (result: SeatGroupResult, today: string): string =>
  [
    `${dayOf(result.terms.date, today)} ${clockOf(result.showtime.startsAt)}`,
    ...result.showtime.presentation.formats,
  ].join(" · ");

export const takeOf = (chosen: SeatGroupResult): string =>
  `Take ${spokenOf(chosen)}`;

export const checkingOf = (chosen: SeatGroupResult): string =>
  `Checking that ${spokenOf(chosen)} ${agreementOf(chosen).are} still there`;

export const openingOf = (chosen: SeatGroupResult): string =>
  `Still there. Opening the ticket site for ${clockOf(chosen.showtime.startsAt)} at ${chosen.showtime.presentation.theater.name}.`;

export const judgedOf = (age: string): string =>
  `Bookable when read ${age} ago`;

export const recheckedOf = (age: string): string => `Checked again ${age} ago`;

export const triedOf = (age: string): string => `Tried ${age} ago`;

export const wentOf = (lost: SeatGroupResult, replaced: boolean): string =>
  replaced
    ? `${spokenOf(lost)} just went.`
    : `${spokenOf(lost)} just went, and nothing in this room replaces them.`;

export const offNowOf = (partySize: number): string =>
  `This showing may be sold out, off sale, already started or short of ${partyOf(partySize).toLowerCase()}, and the ticket site does not say which.`;

export const yoursOf = (chosen: SeatGroupResult): string =>
  `${labelOf(chosen)}, yours`;

export const whereTheyWereOf = (lost: SeatGroupResult): string =>
  `where ${labelOf(lost)} were`;

export const placeOf = (alternative: SeatGroupResult): string =>
  `Row ${alternative.reasons.rowFromFront} · ${lateralOf(alternative.reasons.seatsOffCentre)}`;

export const uncheckedOf = (chosen: SeatGroupResult): string =>
  `${spokenOf(chosen)} may still be there. SeatScout only opens the ticket site after a check.`;
