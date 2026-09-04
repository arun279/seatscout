export type { NormalisedPosition } from "./domain/auditorium.js";
export { normalised } from "./domain/auditorium.js";
export { type AuditoriumPlan, planOf } from "./domain/auditorium-map.js";
export {
  type Amenity,
  type Catalogue,
  type Chain,
  EVERY_AMENITY,
  EVERY_CHAIN,
  EVERY_FORMAT,
  type Format,
  type Movie,
  narrowed,
  type Showtime,
  type ShowtimeTerms,
  type Theater,
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
