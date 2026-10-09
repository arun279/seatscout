import { partyOf } from "./phrases.js";
import type { Terms } from "./terms.js";
import { DAY_MS, type Span, utcOf } from "./when.js";
import { whenWordsOf } from "./when-phrases.js";

export type Missing = "area" | "movie";

export interface Choice<Value> {
  readonly value: Value;
  readonly text: string;
  readonly chosen: boolean;
}

const PARTIES_OFFERED = 6;

export const nextOf = ({ area }: Pick<Terms, "area">): Missing =>
  area === undefined ? "area" : "movie";

export const partiesOf = (party: number): readonly Choice<number>[] =>
  Array.from({ length: PARTIES_OFFERED }, (_, at) => ({
    value: at + 1,
    text: partyOf(at + 1),
    chosen: at + 1 === party,
  }));

const tomorrowOf = (today: string) =>
  new Date(utcOf(today) + DAY_MS).toISOString().slice(0, 10);

export const daysOf = (span: Span, today: string): readonly Choice<Span>[] =>
  [
    { date: today },
    { date: tomorrowOf(today) },
    { date: today, when: { kind: "any" } } satisfies Span,
  ].map((offered) => ({
    value: offered,
    text: whenWordsOf(offered, today),
    chosen:
      offered.date === span.date && offered.when?.kind === span.when?.kind,
  }));
