import { type Terms, termsFrom } from "./terms.js";

export const TODAY = "2026-08-28";

export const EVERY_TERM =
  "?movie=245569&date=2026-08-28&area=75006&partySize=2&chain=AMC&chain=Landmark&theater=aacbt&theater=aaxju&format=Dolby+Cinema&format=IMAX&amenity=Recliners&from=19%3A00&until=21%3A00&accessibleSeating=true";

export const TONIGHT = {
  movie: "245569",
  date: TODAY,
  area: "75006",
  partySize: 2,
} satisfies Terms;

export const everything = (): Terms => termsFrom(EVERY_TERM, TODAY);

export const atOneTheater = (): Terms => ({
  ...TONIGHT,
  theaters: termsFrom("?theater=aacbt", TODAY).theaters,
});

export const atNoTheater = (): Terms => ({
  ...TONIGHT,
  theaters: termsFrom("?theater=nowhere", TODAY).theaters,
});

export const NO_MOVIE = {
  date: TODAY,
  area: "75006",
  partySize: 2,
} satisfies Terms;

export const NOTHING = { date: TODAY, partySize: 2 } satisfies Terms;

export const NO_AREA = {
  movie: "245569",
  date: TODAY,
  partySize: 2,
} satisfies Terms;

export const SMALLEST_LISTING = {
  movie: "245569",
  date: "2026-08-27",
  area: "75006",
  partySize: 2,
} satisfies Terms;

export const SMALLEST_LISTING_WITH_RESULTS = {
  movie: "246427",
  date: TODAY,
  area: "75006",
  partySize: 2,
} satisfies Terms;
