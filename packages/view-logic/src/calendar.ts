import { dayOf, RELATIVE_DAYS } from "./when-phrases.js";
import { daysIn, type Kind, type Span, spanOf, utcOf } from "./when.js";

export type Mark = "none" | "picked" | "between";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const toggledIn = (dates: readonly string[], date: string) => {
  if (!dates.includes(date)) return [...dates, date];
  const kept = dates.filter((one) => one !== date);
  return kept.length > 0 ? kept : dates;
};

const rangeFrom = (span: Span, date: string, today: string): Span =>
  span.when === undefined ? spanOf([`${span.date}..${date}`], today) : { date };

export const tapped = (
  kind: Kind,
  span: Span,
  date: string,
  today: string,
): Span => {
  switch (kind) {
    case "day":
      return { date };
    case "days":
      return spanOf(toggledIn(daysIn(span, today), date), today);
    case "range":
      return rangeFrom(span, date, today);
    case "any":
      return span;
  }
};

const runs = (span: Span) =>
  span.when?.kind === "range" || span.when?.kind === "any";

export const markOf = (span: Span, today: string): ((date: string) => Mark) => {
  const days = daysIn(span, today);
  const [first, last] = [days[0], days.at(-1)];
  return (date) => {
    if (!days.includes(date)) return "none";
    return runs(span) && date !== first && date !== last ? "between" : "picked";
  };
};

export const dayNameOf = (date: string, today: string): string => {
  const day = new Date(utcOf(date));
  const whole = `${WEEKDAYS[day.getUTCDay()]} ${day.getUTCDate()} ${MONTHS[day.getUTCMonth()]}`;
  const said = dayOf(date, today);
  return RELATIVE_DAYS.includes(said) ? `${said}, ${whole}` : whole;
};

export const monthNameOf = (date: string): string => {
  const day = new Date(utcOf(date));
  return `${MONTHS[day.getUTCMonth()]} ${day.getUTCFullYear()}`;
};
