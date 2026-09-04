import { showtimeGroupingCaptures } from "../corpus/captures.js";
import { catalogueFrom } from "../source/catalogue.js";
import type {
  Catalogue,
  Showtime,
  TheaterId,
  Unidentified,
} from "./catalogue.js";

const CAPTURE = "showtimes/grouping-245569-2026-08-28.json";

export const captured = (): Catalogue => {
  const capture = showtimeGroupingCaptures.get(CAPTURE);
  if (capture === undefined) throw new Error(`${CAPTURE} was never captured`);
  const catalogue = catalogueFrom(JSON.stringify(capture.body));
  if (catalogue === null) throw new Error(`${CAPTURE} did not parse`);
  return catalogue;
};

export const everyShowtime = (
  catalogue: Catalogue,
): readonly (Showtime | Unidentified)[] => [
  ...catalogue.bookable,
  ...catalogue.unbookable.map((entry) => entry.showtime),
  ...catalogue.unidentified,
];

export const counted = (catalogue: Catalogue) => ({
  bookable: catalogue.bookable.length,
  unbookable: catalogue.unbookable.length,
  unidentified: catalogue.unidentified.length,
});

export const theaterNamed = (catalogue: Catalogue, name: string): TheaterId => {
  const theater = everyShowtime(catalogue).find(
    (showtime) => showtime.presentation.theater.name === name,
  );
  if (theater === undefined) throw new Error(`${name} is not in this capture`);
  return theater.presentation.theater.id;
};
