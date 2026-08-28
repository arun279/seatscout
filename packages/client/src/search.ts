import {
  type NormalisedPosition,
  REFERENCE,
  type RankReasons,
  type Reading,
  type Seat,
  type SeatGroup,
  type SeatGroupTerms,
  type SeatProfile,
  type Scored,
  type Showtime,
  type ShowtimeId,
  type UnbookableReason,
  type Unidentified,
  normalised,
  scoringIn,
  seatGroupsIn,
} from "@seatscout/core";
import {
  type CatalogueDependencies,
  type CatalogueTerms,
  openCatalogue,
} from "./catalogue.js";

const WIDTH = 24;

export interface SearchTerms extends CatalogueTerms, SeatGroupTerms {
  readonly profile?: SeatProfile;
}

export interface RemovedSeats {
  readonly unavailable: number;
  readonly accessible: number;
}

export interface SeatGroupResult {
  readonly key: string;
  readonly score: number;
  readonly seats: readonly Seat[];
  readonly podDividers: number;
  readonly position: NormalisedPosition;
  readonly reasons: RankReasons;
  readonly showtime: Omit<Showtime, "ticketing">;
  readonly removed: RemovedSeats;
  readonly fetchedAt: number;
  readonly attempts: number;
}

export interface Coverage {
  readonly candidates: number;
  readonly checked: number;
  readonly soldOut: readonly (Showtime | Unidentified)[];
  readonly noSeatMap: readonly (Showtime | Unidentified)[];
  readonly started: readonly (Showtime | Unidentified)[];
  readonly unidentified: readonly Unidentified[];
  readonly failed: readonly ShowtimeId[];
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
  readonly abort: () => void;
}

interface Best extends Scored {
  readonly group: SeatGroup<Seat>;
}

const NOTHING: Coverage = {
  candidates: 0,
  checked: 0,
  soldOut: [],
  noSeatMap: [],
  started: [],
  unidentified: [],
  failed: [],
};

const bestFirst = (left: SeatGroupResult, right: SeatGroupResult) =>
  right.score - left.score || left.showtime.id - right.showtime.id;

const removedFrom = (
  seats: readonly Seat[],
  terms: SeatGroupTerms,
): RemovedSeats => ({
  unavailable: seats.filter((seat) => !seat.bookable).length,
  accessible: terms.accessibleSeating
    ? 0
    : seats.filter((seat) => seat.bookable && seat.designation !== "standard")
        .length,
});

const bestIn = (seats: readonly Seat[], terms: SearchTerms): Best | null => {
  const placed = normalised(seats);
  const score = scoringIn(placed, terms.profile ?? REFERENCE);
  const [best] = seatGroupsIn(placed, terms)
    .map((group) => ({ group, ...score(group) }))
    .toSorted((left, right) => right.score - left.score);
  return best ?? null;
};

const resultOf = (
  showtime: Showtime,
  reading: Extract<Reading<readonly Seat[]>, { ok: true }>,
  best: Best,
  terms: SearchTerms,
): SeatGroupResult => ({
  key: `${showtime.id}:${best.group.seats.map((seat) => seat.id).join("+")}`,
  score: best.score,
  seats: best.group.seats,
  podDividers: best.group.podDividers,
  position: best.position,
  reasons: best.reasons,
  showtime: {
    id: showtime.id,
    startsAt: showtime.startsAt,
    presentation: showtime.presentation,
  },
  removed: removedFrom(reading.payload, terms),
  fetchedAt: reading.fetchedAt,
  attempts: reading.attempts,
});

export const openSearch = (deps: CatalogueDependencies) => {
  const resolve = openCatalogue(deps);

  return (terms: SearchTerms): Search => {
    const listeners = new Set<() => void>();
    const results: SeatGroupResult[] = [];
    const named: Record<UnbookableReason, (Showtime | Unidentified)[]> = {
      noSeatMap: [],
      soldOut: [],
      started: [],
    };
    const failed: ShowtimeId[] = [];
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
          unidentified,
          failed: [...failed],
        },
        phase,
      };
      for (const listener of listeners) listener();
    };

    const record = (showtime: Showtime, reading: Reading<readonly Seat[]>) => {
      if (!reading.ok) {
        if (reading.reason === "unreachable") failed.push(showtime.id);
        else named[reading.reason].push(showtime);
        return;
      }
      checked += 1;
      const best = bestIn(reading.payload, terms);
      if (best !== null) results.push(resultOf(showtime, reading, best, terms));
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
    };
  };
};
