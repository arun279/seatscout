export type { NormalisedPosition } from "./domain/auditorium.js";
export { normalised } from "./domain/auditorium.js";
export {
  type Catalogue,
  narrowed,
  type Showtime,
  type ShowtimeId,
  type ShowtimeTerms,
  type UnbookableReason,
  type Unidentified,
} from "./domain/catalogue.js";
export {
  type SeatGroup,
  type SeatGroupTerms,
  seatGroupsIn,
} from "./domain/seat-group.js";
export {
  REFERENCE,
  type RankReasons,
  type Scored,
  type SeatProfile,
  scoringIn,
} from "./domain/seat-profile.js";
export { openSource } from "./source/aggregator.js";
export type { Reading, Source } from "./source/port.js";
export type { Seat } from "./source/seat-map.js";
