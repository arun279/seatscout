import { DAY_MS, daysIn, HORIZON, type Span, utcOf } from "./when.js";

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

export const RELATIVE_DAYS: readonly string[] = ["Today", "Tomorrow"];

const calendarOf = (date: string) => {
  const day = new Date(utcOf(date));
  return {
    weekday: `${DAYS[day.getUTCDay()]} ${day.getUTCDate()}`,
    month: `${MONTHS[day.getUTCMonth()]}`,
  };
};

export const dayOf = (date: string, today: string): string => {
  const ahead = (utcOf(date) - utcOf(today)) / DAY_MS;
  if (ahead === 0) return "Today";
  if (ahead === 1) return "Tomorrow";
  const { weekday, month } = calendarOf(date);
  return `${weekday} ${month}`;
};

export const whenOf = (date: string, today: string): string => {
  const day = dayOf(date, today);
  return RELATIVE_DAYS.includes(day) ? day.toLowerCase() : `on ${day}`;
};

const MOST_LISTED = 3;

const listed = (dates: readonly string[]) => {
  const days = dates.map(calendarOf);
  return days
    .map(({ weekday, month }, at) =>
      days[at + 1]?.month === month ? weekday : `${weekday} ${month}`,
    )
    .join(", ");
};

const between = (first: string, last: string) => {
  const from = calendarOf(first);
  const to = calendarOf(last);
  const start =
    from.month === to.month ? from.weekday : `${from.weekday} ${from.month}`;
  return `${start} to ${to.weekday} ${to.month}`;
};

const namedOrCounted = (dates: readonly string[], counted: string) =>
  dates.length > MOST_LISTED ? `${dates.length} ${counted}` : listed(dates);

export const whenWordsOf = (span: Span, today: string): string => {
  switch (span.when?.kind) {
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

export const costOf = (span: Span, today: string): string | undefined => {
  const days = daysIn(span, today).length;
  return days > 1
    ? `${days} days is ${days} days of reading. The nearest day comes back first.`
    : undefined;
};

export const whenSaidOf = (span: Span, today: string): string => {
  switch (span.when?.kind) {
    case undefined:
      return whenOf(span.date, today);
    case "any":
      return `any day in the next ${HORIZON} days`;
    default:
      return whenWordsOf(span, today);
  }
};

export const unreadOf = (span: Span, today: string): string | undefined => {
  const [, first = span.date, ...more] = daysIn(span, today);
  const last = more.at(-1) ?? first;
  switch (span.when?.kind) {
    case undefined:
      return undefined;
    case "days":
      return `${namedOrCounted([first, ...more], "days")} not read yet`;
    default:
      return `${first === last ? listed([first]) : between(first, last)} not read yet`;
  }
};
