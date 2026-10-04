import {
  type AuditoriumMap,
  auditoriumMap,
  type Reading,
  type Seat,
  type Showtime,
  type UnbookableReason,
  type Unidentified,
} from "@seatscout/core";
import {
  type CatalogueDependencies,
  type CatalogueTerms,
  openCatalogue,
} from "./catalogue.js";
import type { Cooldown } from "./cooldown.js";
import { type Day, type Listed, openDays, type SeatMapState } from "./days.js";
import { fannedOut } from "./fan-out.js";
import type { SourceLimits } from "./limits.js";
import {
  type Ranking,
  type ResultTerms,
  rankingIn,
  type SeatGroupResult,
} from "./ranking.js";

export interface SearchTerms
  extends Omit<CatalogueTerms, "date">,
    Omit<ResultTerms, "date"> {
  readonly dates: readonly string[];
}

export interface Coverage {
  readonly candidates: number;
  readonly checked: number;
  readonly soldOut: readonly (Showtime | Unidentified)[];
  readonly noSeatMap: readonly (Showtime | Unidentified)[];
  readonly started: readonly (Showtime | Unidentified)[];
  readonly salesOff: readonly (Showtime | Unidentified)[];
  readonly unidentified: readonly Unidentified[];
  readonly failed: readonly Showtime[];
}

export type Phase = "resolving" | "searching" | "settled" | "unreachable";

export interface Snapshot {
  readonly results: readonly SeatGroupResult[];
  readonly coverage: Coverage;
  readonly phase: Phase;
  readonly days: readonly Day[];
  readonly refusedUntil: number | null;
}

export interface Auditorium {
  readonly map: AuditoriumMap;
  readonly recommended: NonNullable<AuditoriumMap["recommended"]>;
  readonly offered: readonly SeatGroupResult[];
}

export interface Search {
  readonly snapshot: () => Snapshot;
  readonly subscribe: (onChange: () => void) => () => void;
  readonly done: Promise<Snapshot>;
  readonly retry: () => Promise<Snapshot>;
  readonly readMore: () => Promise<Snapshot>;
  readonly abort: () => void;
  readonly auditorium: (result: SeatGroupResult) => Auditorium;
}

interface Room {
  readonly showtime: Showtime;
  readonly seats: readonly Seat[];
  readonly ranking: Ranking;
}

const NOTHING: Coverage = {
  candidates: 0,
  checked: 0,
  soldOut: [],
  noSeatMap: [],
  started: [],
  salesOff: [],
  unidentified: [],
  failed: [],
};

const nearestDayThenBest = (left: SeatGroupResult, right: SeatGroupResult) =>
  left.terms.date.localeCompare(right.terms.date) ||
  right.score - left.score ||
  left.showtime.id - right.showtime.id;

const withinDay = (terms: SearchTerms, date: string): CatalogueTerms => ({
  ...terms,
  date,
  ...(terms.from !== undefined && { from: `${date}T${terms.from}` }),
  ...(terms.until !== undefined && { until: `${date}T${terms.until}` }),
});

export interface SearchDependencies extends CatalogueDependencies {
  readonly limits: SourceLimits;
  readonly cooldown: Cooldown;
}

export const openSearch = (deps: SearchDependencies) => {
  const resolve = openCatalogue(deps);

  return (terms: SearchTerms): Search => {
    const dates = [...terms.dates].sort();
    const byDay = openDays(dates, deps.limits.seatMapsPerStep);
    const listeners = new Set<() => void>();
    const results: SeatGroupResult[] = [];
    const named: Record<UnbookableReason, (Showtime | Unidentified)[]> = {
      noSeatMap: [],
      salesOff: [],
      soldOut: [],
      started: [],
    };
    const failed: Listed[] = [];
    const unidentified: Unidentified[] = [];
    const rooms = new Map<Showtime["id"], Room>();
    let candidates = 0;
    let checked = 0;
    let aborted = false;
    let refusedUntil: number | null = null;

    let current: Snapshot = {
      results: [],
      coverage: NOTHING,
      phase: "resolving",
      days: byDay.days(),
      refusedUntil,
    };

    const publish = (phase: Phase) => {
      current = {
        results: [...results].sort(nearestDayThenBest),
        coverage: {
          candidates,
          checked,
          soldOut: [...named.soldOut],
          noSeatMap: [...named.noSeatMap],
          started: [...named.started],
          salesOff: [...named.salesOff],
          unidentified: [...unidentified],
          failed: failed.map((entry) => entry.showtime),
        },
        phase,
        days: byDay.days(),
        refusedUntil,
      };
      for (const listener of listeners) listener();
    };

    const auditorium = (result: SeatGroupResult): Auditorium => {
      const room = rooms.get(result.showtime.id);
      if (room === undefined)
        throw new Error(
          `this search never read the room of Showtime ${result.showtime.id}`,
        );
      const map = auditoriumMap(room.seats, result.seats);
      if (map.recommended === null)
        throw new Error(
          `the Seat Group is not in the room of Showtime ${result.showtime.id}`,
        );
      return {
        map,
        recommended: map.recommended,
        offered: room.ranking.offered.map((ranked) =>
          room.ranking.resultOf(room.showtime, ranked),
        ),
      };
    };

    const settle = (entry: Listed) => {
      byDay.mark(entry, "read");
      const unreached = failed.indexOf(entry);
      if (unreached >= 0) failed.splice(unreached, 1);
    };

    const rank = (
      { showtime, date }: Listed,
      read: Extract<Reading<readonly Seat[]>, { ok: true }>,
    ) => {
      checked += 1;
      const ranking = rankingIn(read, { ...terms, date });
      rooms.set(showtime.id, { showtime, seats: read.payload, ranking });
      const [best] = ranking.offered;
      if (best !== undefined) results.push(ranking.resultOf(showtime, best));
    };

    const record = (
      entry: Listed,
      reading: Reading<readonly Seat[]>,
      before: SeatMapState | undefined,
    ) => {
      if (reading.ok) {
        settle(entry);
        return rank(entry, reading);
      }
      if (reading.reason === "refused") {
        refusedUntil = deps.cooldown.until();
        return byDay.mark(entry, before);
      }
      settle(entry);
      if (reading.reason === "unreachable") failed.push(entry);
      else named[reading.reason].push(entry.showtime);
    };

    const check =
      (before: SeatMapState | undefined) => async (entry: Listed) => {
        if (aborted || refusedUntil !== null) return byDay.mark(entry, before);
        const reading = await deps.source.seatsFor(`${entry.showtime.id}`);
        if (aborted) return byDay.mark(entry, before);
        record(entry, reading, before);
        publish("searching");
      };

    const readAll = async (batch: readonly Listed[], before?: SeatMapState) => {
      for (const entry of batch) byDay.mark(entry, "reading");
      publish("searching");
      await fannedOut(batch, deps.limits.width, check(before));
      publish("settled");
      return current;
    };

    const readNext = () => readAll(byDay.next());

    const listings = () =>
      Promise.all(
        dates.map(async (date) => ({
          date,
          reading: await resolve(withinDay(terms, date)),
        })),
      );

    const unlisted = (
      read: readonly { readonly reading: Reading<unknown> }[],
    ) => {
      if (
        read.some(({ reading }) => !reading.ok && reading.reason === "refused")
      )
        refusedUntil = deps.cooldown.until();
      publish("unreachable");
      return current;
    };

    const run = async () => {
      const read = await listings();
      const catalogues = read.flatMap(({ date, reading }) =>
        reading.ok ? [{ date, catalogue: reading.payload }] : [],
      );
      if (catalogues.length < read.length) return unlisted(read);
      for (const { date, catalogue } of catalogues) {
        candidates +=
          catalogue.bookable.length +
          catalogue.unbookable.length +
          catalogue.unidentified.length;
        unidentified.push(...catalogue.unidentified);
        for (const entry of catalogue.unbookable)
          named[entry.reason].push(entry.showtime);
        byDay.list(date, catalogue.bookable);
      }
      if (!aborted) return readNext();
      publish("settled");
      return current;
    };

    let running = run();

    return {
      snapshot: () => current,
      subscribe: (onChange) => {
        listeners.add(onChange);
        return () => listeners.delete(onChange);
      },
      done: running,
      retry: () => {
        if (refusedUntil !== null) return running;
        if (current.phase === "unreachable") running = run();
        else if (current.phase === "settled")
          running = readAll([...failed], "read");
        return running;
      },
      readMore: () => {
        if (
          current.phase === "settled" &&
          refusedUntil === null &&
          current.days.some((day) => day.unread > 0)
        )
          running = readNext();
        return running;
      },
      abort: () => {
        aborted = true;
      },
      auditorium,
    };
  };
};
