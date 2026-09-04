import type { SeatGroupResult } from "@seatscout/client";

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

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DAY_MS = 24 * 60 * 60 * 1000;

const wordOf = (count: number) => WORDS[count - 1] ?? `${count}`;

const capitalised = (phrase: string) =>
  phrase.charAt(0).toUpperCase() + phrase.slice(1);

export const twoDigits = (value: number) => `${value}`.padStart(2, "0");

export const clockOf = (startsAt: string): string => {
  const hours = Number(startsAt.slice(11, 13));
  const minutes = startsAt.slice(14, 16);
  const onClock = hours % 12 === 0 ? 12 : hours % 12;
  return `${onClock}:${minutes}${hours < 12 ? "a" : "p"}`;
};

export const ageOf = (fetchedAt: number, now: number): string => {
  const seconds = Math.max(0, Math.floor((now - fetchedAt) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${twoDigits(seconds % 60)}s`;
  return `${Math.floor(minutes / 60)}h ${twoDigits(minutes % 60)}m`;
};

const seatsPhrase = (halves: number) => {
  const whole = Math.floor(halves / 2);
  const half = halves % 2 === 1;
  if (whole >= 10) return `${whole}${half ? "½" : ""} seats`;
  if (!half) return `${wordOf(whole)} seat${whole === 1 ? "" : "s"}`;
  return `${wordOf(whole)} and a half seats`;
};

export const lateralOf = (seatsOffCentre: number): string => {
  const away = Math.abs(seatsOffCentre);
  if (away < 0.75) return "on the centreline";
  const side = Math.sign(seatsOffCentre) === -1 ? "left" : "right";
  return `${seatsPhrase(Math.round(away * 2))} ${side} of centre`;
};

export const partyOf = (party: number): string =>
  party === 1 ? "One seat" : `${capitalised(wordOf(party))} seats together`;

const utcOf = (date: string) => Date.parse(`${date}T00:00:00Z`);

export const dayOf = (date: string, today: string): string => {
  const ahead = (utcOf(date) - utcOf(today)) / DAY_MS;
  if (ahead === 0) return "Today";
  if (ahead === 1) return "Tomorrow";
  const day = new Date(utcOf(date));
  return `${DAYS[day.getUTCDay()]} ${day.getUTCDate()} ${MONTHS[day.getUTCMonth()]}`;
};

export const whenOf = (date: string, today: string): string => {
  const day = dayOf(date, today);
  return day === "Today" || day === "Tomorrow"
    ? day.toLowerCase()
    : `on ${day}`;
};

export const noneOf = (party: number): string =>
  party === 1 ? "No seat" : `No ${wordOf(party)} seats together`;

export const whyOf = (reasons: RankReasons, podDividers: number): string =>
  [
    `Row ${reasons.rowFromFront} of ${reasons.rowCount}`,
    lateralOf(reasons.seatsOffCentre),
    ...(reasons.inFrontBand ? ["in the front rows"] : []),
    ...(reasons.againstWall ? ["against a wall"] : []),
    ...(podDividers === 1 ? ["across a console"] : []),
    ...(podDividers > 1 ? [`across ${wordOf(podDividers)} consoles`] : []),
  ].join(" · ");
