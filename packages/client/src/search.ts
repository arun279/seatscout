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
import {
  type Ranking,
  type ResultTerms,
  rankingIn,
  type SeatGroupResult,
} from "./ranking.js";

const WIDTH = 24;

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

export interface Auditorium {
  readonly map: AuditoriumMap;
  readonly recommended: NonNullable<AuditoriumMap["recommended"]>;
  readonly offered: readonly SeatGroupResult[];
}

export interface Search {
  readonly snapshot: () => Snapshot;
  readonly subscribe: (onChange: () => void) => () => void;
  readonly done: Promise<Snapshot>;
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
    const rooms = new Map<Showtime["id"], Room>();
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
      rooms.set(showtime.id, { showtime, seats: reading.payload, ranking });
      const [best] = ranking.offered;
      if (best !== undefined) results.push(ranking.resultOf(showtime, best));
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

    const check = async (showtime: Showtime) => {
      const reading = await deps.source.seatsFor(`${showtime.id}`);
      if (aborted) return;
      record(showtime, reading);
      publish("searching");
    };

    const fanOut = async (bookable: readonly Showtime[]) => {
      const queue = bookable[Symbol.iterator]();
      const worker = async () => {
        for (const showtime of queue) {
          if (aborted) return;
          await check(showtime);
        }
      };
      await Promise.all(Array.from({ length: WIDTH }, worker));
    };

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

    return {
      snapshot: () => current,
      subscribe: (onChange) => {
        listeners.add(onChange);
        return () => listeners.delete(onChange);
      },
      done: run(),
      abort: () => {
        aborted = true;
      },
      auditorium,
    };
  };
};
