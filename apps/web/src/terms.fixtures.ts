import { type Terms, termsFrom } from "./terms.js";

export const TODAY = "2026-08-28";

export const EVERY_TERM =
  "?movie=245569&date=2026-08-28&area=75006&partySize=2&chain=AMC&chain=Landmark&theater=aacbt&theater=aaxju&format=Dolby+Cinema&format=IMAX&amenity=Recliners&from=19%3A00&until=21%3A00&accessibleSeating=true";

export const EVERYTHING: Terms = termsFrom(EVERY_TERM, TODAY);

export const TONIGHT: Terms = {
  movie: "245569",
  date: TODAY,
  area: "75006",
  partySize: 2,
};

export const AT_ONE_THEATER: Terms = {
  ...TONIGHT,
  theaters: termsFrom("?theater=aacbt", TODAY).theaters,
};

export const AT_NO_THEATER: Terms = {
  ...TONIGHT,
  theaters: termsFrom("?theater=nowhere", TODAY).theaters,
};

export const NO_MOVIE: Terms = { date: TODAY, area: "75006", partySize: 2 };

export const NOTHING: Terms = { date: TODAY, partySize: 2 };
