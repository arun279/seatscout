export const HORIZON = 7;

export type When =
  | { readonly reading: "days"; readonly dates: readonly string[] }
  | { readonly reading: "range"; readonly first: string; readonly last: string }
  | { readonly reading: "any" };

export interface Span {
  readonly date: string;
  readonly when?: When;
}

const LISTING_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RANGE = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/;
const ANY = "any";
const DAY_MS = 24 * 60 * 60 * 1000;

const dayAfter = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);

const rangeOf = ([first = "", last = ""]: readonly string[]): Span =>
  first === last
    ? { date: first }
    : { date: first, when: { reading: "range", first, last } };

const picked = (asked: readonly string[], today: string): Span => {
  const dates = [...new Set(asked.filter((date) => LISTING_DATE.test(date)))];
  dates.sort();
  const [date = today] = dates;
  return dates.length > 1
    ? { date, when: { reading: "days", dates } }
    : { date };
};

export const spanOf = (asked: readonly string[], today: string): Span => {
  const [only] = asked;
  if (asked.length === 1 && only === ANY)
    return { date: today, when: { reading: ANY } };
  const range = RANGE.exec(only ?? "");
  return asked.length === 1 && range !== null
    ? rangeOf([range[1] ?? "", range[2] ?? ""].sort())
    : picked(asked, today);
};

export const valuesOf = ({ date, when }: Span): readonly string[] => {
  switch (when?.reading) {
    case undefined:
      return [date];
    case "days":
      return when.dates;
    case "range":
      return [`${when.first}..${when.last}`];
    case "any":
      return [ANY];
  }
};

const run = (first: string, count: number) =>
  Array.from({ length: count }, (_, days) => dayAfter(first, days));

export const daysIn = (
  { date, when }: Span,
  today: string,
): readonly string[] => {
  switch (when?.reading) {
    case undefined:
      return [date];
    case "days":
      return when.dates;
    case "range":
      return run(
        when.first,
        (Date.parse(when.last) - Date.parse(when.first)) / DAY_MS + 1,
      );
    case "any":
      return run(today, HORIZON);
  }
};
