import type { Coverage, Snapshot } from "@seatscout/client";
import { accountOf, toGoIn, unreadIn } from "./derived.js";
import {
  coverageOf,
  nameOf,
  retryOf,
  SLOWED,
  searchAgainAfter,
  UNREACHED,
} from "./results-phrases.js";

export const ACCOUNTED_FOR = "Every showtime, accounted for";

type Showtimes = Coverage["soldOut"];

interface NamedShowtime {
  readonly key: string;
  readonly said: string;
}

export interface LedgerRow {
  readonly count: number;
  readonly label: string;
  readonly remedy: string;
  readonly named: readonly NamedShowtime[];
  readonly retry: string | null;
}

const counted = (count: number, label: string, remedy: string): LedgerRow => ({
  count,
  label,
  remedy,
  named: [],
  retry: null,
});

const named = (
  showtimes: Showtimes,
  label: string,
  remedy: string,
): LedgerRow => ({
  ...counted(showtimes.length, label, remedy),
  named: showtimes.map((showtime) => ({
    key: showtime.ticketing,
    said: nameOf(showtime),
  })),
});

const retryable = ({ phase, refusedUntil }: Snapshot): boolean =>
  phase === "settled" && refusedUntil === null;

const unreached = (snapshot: Snapshot): LedgerRow => {
  const { failed } = snapshot.coverage;
  return retryable(snapshot)
    ? {
        ...named(
          failed,
          UNREACHED,
          "The room did not answer. Trying again may reach it.",
        ),
        retry: retryOf(failed),
      }
    : named(failed, UNREACHED, "The room did not answer.");
};

const notReadYet = (
  snapshot: Snapshot,
  clockAfter: (at: number) => string,
): string => {
  if (snapshot.refusedUntil !== null)
    return `${SLOWED} ${searchAgainAfter(clockAfter(snapshot.refusedUntil))}`;
  return retryable(snapshot)
    ? "Not asked for yet. Read more from the list."
    : "Not asked for yet.";
};

export const ledgerOf = (
  snapshot: Snapshot,
  clockAfter: (at: number) => string,
): readonly LedgerRow[] => {
  const { coverage } = snapshot;
  return [
    counted(
      coverage.checked,
      "Checked",
      "Seat maps read and judged. Every result on the list came from these.",
    ),
    named(
      coverage.started,
      "Already started",
      "These had begun by the time the listing was read. Later showings stay on the list.",
    ),
    named(
      coverage.noSeatMap,
      "No seat map",
      "General admission, so there are no seats to rank. A retry cannot change that.",
    ),
    named(
      coverage.soldOut,
      "Sold out",
      "No seats left. Other times at the same theater stay on the list.",
    ),
    named(
      coverage.salesOff,
      "Sales switched off",
      "The theater is not selling these, so no seat map was asked for.",
    ),
    named(
      coverage.unidentified,
      "Never identified",
      "The listing gave nothing to ask for a seat map with, so none can be read.",
    ),
    unreached(snapshot),
    counted(toGoIn(snapshot), "Being read", "Asked for, not answered yet."),
    counted(
      unreadIn(snapshot),
      "Not read yet",
      notReadYet(snapshot, clockAfter),
    ),
  ].filter((row) => row.count > 0);
};

const candidatesOf = (candidates: number): string =>
  `${candidates} ${candidates === 1 ? "candidate" : "candidates"}`;

export const sumOf = (
  snapshot: Snapshot,
  clockAfter: (at: number) => string,
): string => {
  if (snapshot.phase === "resolving" || snapshot.phase === "unreachable")
    return coverageOf(snapshot);
  const counts = ledgerOf(snapshot, clockAfter).map((row) => row.count);
  const total = candidatesOf(accountOf(snapshot.coverage).candidates);
  return counts.length === 0 ? total : `${counts.join(" + ")} = ${total}`;
};
