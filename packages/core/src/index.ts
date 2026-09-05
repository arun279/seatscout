export type { NormalisedPosition } from "./domain/auditorium.js";
export { normalised } from "./domain/auditorium.js";
export {
  type AuditoriumMap,
  type AuditoriumPlan,
  auditoriumMap,
  nearestInRow,
  planOf,
  type PositionedSeat,
  type SeatRow,
} from "./domain/auditorium-map.js";
export {
  type Catalogue,
  narrowed,
  type Showtime,
  type ShowtimeTerms,
  type TicketingUrl,
  type UnbookableReason,
  type Unidentified,
} from "./domain/catalogue.js";
export {
  type SeatGroup,
  type SeatGroupTerms,
  seatGroupsIn,
} from "./domain/seat-group.js";
export {
  type RankReasons,
  REFERENCE,
  type Scored,
  type SeatProfile,
  scoringIn,
} from "./domain/seat-profile.js";
export { openSource, type SourceDependencies } from "./source/aggregator.js";
export type { Reading, Source } from "./source/port.js";
export type { Seat } from "./source/seat-map.js";
