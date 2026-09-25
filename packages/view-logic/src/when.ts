export const HORIZON = 7;

export type When =
  | { readonly kind: "days"; readonly dates: readonly string[] }
  | { readonly kind: "range"; readonly first: string; readonly last: string }
  | { readonly kind: "any" };

export type Kind = "day" | When["kind"];

export interface Span {
  readonly date: string;
  readonly when?: When;
}

const LISTING_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RANGE = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/;
const ANY = "any";
export const DAY_MS: number = 24 * 60 * 60 * 1000;

export const utcOf = (date: string): number => Date.parse(`${date}T00:00:00Z`);

const dayAfter = (date: string, days: number) =>
  new Date(utcOf(date) + days * DAY_MS).toISOString().slice(0, 10);

const rangeOf = (ends: RegExpExecArray, today: string): Span => {
  const [first = today, last = today] = ends.slice(1).sort();
  return first === last
    ? { date: first }
    : { date: first, when: { kind: "range", first, last } };
};

const picked = (asked: readonly string[], today: string): Span => {
  const dates = [...new Set(asked.filter((date) => LISTING_DATE.test(date)))];
  dates.sort();
  const [date = today] = dates;
  return dates.length > 1 ? { date, when: { kind: "days", dates } } : { date };
};

export const spanOf = (asked: readonly string[], today: string): Span => {
  const only = asked.join();
  if (only === ANY) return { date: today, when: { kind: ANY } };
  const ends = RANGE.exec(only);
  return ends === null ? picked(asked, today) : rangeOf(ends, today);
};

export const whenValuesOf = (when: When): readonly string[] => {
  switch (when.kind) {
    case "days":
      return when.dates;
    case "range":
      return [`${when.first}..${when.last}`];
    case "any":
      return [ANY];
  }
};

export const valuesOf = ({ date, when }: Span): readonly string[] =>
  when === undefined ? [date] : whenValuesOf(when);

const run = (first: string, count: number) =>
  Array.from({ length: count }, (_, days) => dayAfter(first, days));

export const spanIn = (kind: Kind, date: string, today: string): Span => {
  switch (kind) {
    case "day":
    case "days":
      return { date };
    case "range":
      return {
        date,
        when: { kind, first: date, last: dayAfter(date, HORIZON - 1) },
      };
    case "any":
      return { date: today, when: { kind } };
  }
};

export const daysIn = (
  { date, when }: Span,
  today: string,
): readonly string[] => {
  switch (when?.kind) {
    case undefined:
      return [date];
    case "days":
      return when.dates;
    case "range":
      return run(
        when.first,
        (utcOf(when.last) - utcOf(when.first)) / DAY_MS + 1,
      );
    case "any":
      return run(today, HORIZON);
  }
};
