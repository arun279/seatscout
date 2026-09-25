import { calendarOf, dayOf } from "./phrases.js";
import { daysIn, HORIZON, type Span } from "./when.js";

const MOST_LISTED = 3;

const listed = (dates: readonly string[]) =>
  dates
    .map((date, at) => {
      const { weekday, month } = calendarOf(date);
      const next = dates[at + 1];
      return next === undefined || calendarOf(next).month !== month
        ? `${weekday} ${month}`
        : weekday;
    })
    .join(", ");

const between = (first: string, last: string) => {
  const from = calendarOf(first);
  const to = calendarOf(last);
  const start =
    from.month === to.month ? from.weekday : `${from.weekday} ${from.month}`;
  return `${start} to ${to.weekday} ${to.month}`;
};

const namedOrCounted = (dates: readonly string[], counted: string) =>
  dates.length > MOST_LISTED ? `${dates.length} ${counted}` : listed(dates);

const spanned = (dates: readonly string[]) => {
  const first = dates[0] ?? "";
  const last = dates.at(-1) ?? first;
  return first === last ? listed([first]) : between(first, last);
};

export const whenWordsOf = (span: Span, today: string): string => {
  switch (span.when?.reading) {
    case undefined:
      return dayOf(span.date, today);
    case "days":
      return namedOrCounted(span.when.dates, "days picked");
    case "range":
      return between(span.when.first, span.when.last);
    case "any":
      return `Any day in the next ${HORIZON} days`;
  }
};

export const readingOf = (span: Span, today: string): string | undefined => {
  const days = daysIn(span, today).length;
  return days > 1
    ? `${days} days is ${days} days of reading. The nearest day comes back first.`
    : undefined;
};

export const unreadOf = (span: Span, today: string): string | undefined => {
  const rest = daysIn(span, today).slice(1);
  if (rest.length === 0) return undefined;
  const words =
    span.when?.reading === "days"
      ? namedOrCounted(rest, "days")
      : spanned(rest);
  return `${words} not read yet`;
};
