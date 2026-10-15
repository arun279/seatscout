import {
  isReference,
  type RecentSearch,
  type SeatGroupResult,
  type SeatProfile,
} from "@seatscout/client";
import { seatsOf } from "./derived.js";
import { nextOf, type Step } from "./step.js";
import type { Terms } from "./terms.js";
import { spanOf } from "./when.js";
import { RELATIVE_DAYS, whenWordsOf } from "./when-phrases.js";

type RankReasons = SeatGroupResult["reasons"];

const WORDS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];

export const wordOf = (count: number): string => WORDS[count - 1] ?? `${count}`;

export const capitalised = (phrase: string): string =>
  phrase.charAt(0).toUpperCase() + phrase.slice(1);

export const twoDigits = (value: number): string => `${value}`.padStart(2, "0");

export const timeOf = (clock: string): string => {
  const hours = Number(clock.slice(0, 2));
  const minutes = clock.slice(3, 5);
  const onClock = hours % 12 === 0 ? 12 : hours % 12;
  return `${onClock}:${minutes}${hours < 12 ? "a" : "p"}`;
};

export const clockOf = (startsAt: string): string =>
  timeOf(startsAt.slice(11, 16));

export const ageOf = (fetchedAt: number, now: number): string => {
  const seconds = Math.max(0, Math.floor((now - fetchedAt) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${twoDigits(seconds % 60)}s`;
  return `${Math.floor(minutes / 60)}h ${twoDigits(minutes % 60)}m`;
};

const seatsPhrase = (halves: number) => {
  const whole = Math.floor(halves / 2);
  if (halves % 2 === 1) return `${wordOf(whole)} and a half seats`;
  return `${wordOf(whole)} seat${whole === 1 ? "" : "s"}`;
};

export const lateralOf = (seatsOffCentre: number): string => {
  const away = Math.abs(seatsOffCentre);
  if (away < 0.75) return "on the centreline";
  const side = Math.sign(seatsOffCentre) === -1 ? "left" : "right";
  return `${seatsPhrase(Math.round(away * 2))} ${side} of centre`;
};

export const labelOf = (result: SeatGroupResult): string =>
  seatsOf(result).join("·");

export const spokenOf = (result: SeatGroupResult): string => {
  const seats = seatsOf(result);
  return [seats.slice(0, -1).join(", "), seats.at(-1)]
    .filter(Boolean)
    .join(" and ");
};

export interface Agreement {
  readonly they: string;
  readonly are: string;
}

export const agreementOf = (result: SeatGroupResult): Agreement =>
  result.seats.length === 1
    ? { they: "It", are: "is" }
    : { they: "They", are: "are" };

export const partyOf = (party: number): string =>
  party === 1 ? "One seat" : `${capitalised(wordOf(party))} seats together`;

export const seatOf = (profile: SeatProfile): string =>
  isReference(profile) ? "Reference seat" : "Custom seat";

export const saidOf = (search: RecentSearch, today: string): string => {
  const day = whenWordsOf(spanOf(search.dates, today), today);
  return [
    `${search.partySize} seat${search.partySize === 1 ? "" : "s"}`,
    RELATIVE_DAYS.includes(day) ? day.toLowerCase() : day,
    search.area,
  ].join(" · ");
};

export const FIND_SEATS = "Find seats";

export const OFFLINE =
  "Offline. Seats are never cached, so nothing here is refreshed until the connection returns.";

export const NOTHING_REMEMBERED =
  "Nothing yet. Searches are kept on this phone once you have run one, and never anywhere else.";

const STEPS: Readonly<Record<Step, string>> = {
  area: "Name an area",
  movie: "Pick a movie",
};

export const nextStepOf = (terms: Pick<Terms, "area" | "movie">): string => {
  const next = nextOf(terms);
  return next === undefined ? FIND_SEATS : STEPS[next];
};

export const ledeOf = ({
  area,
  movie,
}: Pick<Terms, "area" | "movie">): string | undefined => {
  if (area === undefined) return "Name an area, then a movie playing near it.";
  return movie === undefined ? `Pick a movie playing near ${area}.` : undefined;
};

export const noneOf = (party: number): string =>
  party === 1 ? "No seat" : `No ${wordOf(party)} seats together`;

export const penaltiesOf = (
  reasons: RankReasons,
  podDividers: number,
): readonly string[] => [
  ...(reasons.inFrontBand ? ["in the front rows"] : []),
  ...(reasons.againstWall ? ["against a wall"] : []),
  ...(podDividers === 1 ? ["across a console"] : []),
  ...(podDividers > 1 ? [`across ${wordOf(podDividers)} consoles`] : []),
];

export const whyOf = (reasons: RankReasons, podDividers: number): string =>
  [
    `Row ${reasons.rowFromFront} of ${reasons.rowCount}`,
    lateralOf(reasons.seatsOffCentre),
    ...penaltiesOf(reasons, podDividers),
  ].join(" · ");
