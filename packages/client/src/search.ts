import type {
  Reading,
  Seat,
  Showtime,
  UnbookableReason,
  Unidentified,
} from "@seatscout/core";
import {
  type CatalogueDependencies,
  type CatalogueTerms,
  openCatalogue,
} from "./catalogue.js";
import { fannedOut } from "./fan-out.js";
import {
  type ResultTerms,
  rankingIn,
  type SeatGroupResult,
} from "./ranking.js";

export interface SearchTerms extends CatalogueTerms, ResultTerms {}

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
}

export interface Search {
  readonly snapshot: () => Snapshot;
  readonly subscribe: (onChange: () => void) => () => void;
  readonly done: Promise<Snapshot>;
  readonly retry: () => Promise<Snapshot>;
  readonly abort: () => void;
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

const bestFirst = (left: SeatGroupResult, right: SeatGroupResult) =>
  right.score - left.score || left.showtime.id - right.showtime.id;

export const openSearch = (deps: CatalogueDependencies) => {
  const resolve = openCatalogue(deps);

  return (terms: SearchTerms): Search => {
    const listeners = new Set<() => void>();
    const results: SeatGroupResult[] = [];
    const named: Record<UnbookableReason, (Showtime | Unidentified)[]> = {
      noSeatMap: [],
      salesOff: [],
      soldOut: [],
      started: [],
    };
    const failed: Showtime[] = [];
    let unidentified: readonly Unidentified[] = [];
    let candidates = 0;
    let checked = 0;
    let aborted = false;
    let current: Snapshot = {
      results: [],
      coverage: NOTHING,
      phase: "resolving",
    };

    const publish = (phase: Phase) => {
      current = {
        results: results.toSorted(bestFirst),
        coverage: {
          candidates,
          checked,
          soldOut: [...named.soldOut],
          noSeatMap: [...named.noSeatMap],
          started: [...named.started],
          salesOff: [...named.salesOff],
          unidentified,
          failed: [...failed],
        },
        phase,
      };
      for (const listener of listeners) listener();
    };

    const record = (showtime: Showtime, reading: Reading<readonly Seat[]>) => {
      if (!reading.ok) {
        if (reading.reason === "unreachable") failed.push(showtime);
        else named[reading.reason].push(showtime);
        return;
      }
      checked += 1;
      const ranking = rankingIn(reading, terms);
      const [best] = ranking.offered;
      if (best !== undefined) results.push(ranking.resultOf(showtime, best));
    };

    const check = async (showtime: Showtime) => {
      if (aborted) return;
      const reading = await deps.source.seatsFor(`${showtime.id}`);
      if (aborted) return;
      record(showtime, reading);
      publish("searching");
    };

    const fanOut = (bookable: readonly Showtime[]) =>
      fannedOut(bookable, check);

    const run = async () => {
      const reading = await resolve(terms);
      if (!reading.ok) {
        publish("unreachable");
        return current;
      }
      candidates =
        reading.payload.bookable.length +
        reading.payload.unbookable.length +
        reading.payload.unidentified.length;
      unidentified = reading.payload.unidentified;
      for (const entry of reading.payload.unbookable)
        named[entry.reason].push(entry.showtime);
      if (!aborted) {
        publish("searching");
        await fanOut(reading.payload.bookable);
      }
      publish("settled");
      return current;
    };

    const recheck = async () => {
      const unreached = failed.splice(0);
      publish("searching");
      await fanOut(unreached);
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
        if (current.phase === "unreachable") running = run();
        else if (current.phase === "settled") running = recheck();
        return running;
      },
      abort: () => {
        aborted = true;
      },
    };
  };
};
