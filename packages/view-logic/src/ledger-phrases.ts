import type { Coverage, Snapshot } from "@seatscout/client";
import { accountOf, toGoIn, unreadIn } from "./derived.js";
import { timeOf } from "./phrases.js";
import { coverageOf, nameOf, retryOf, UNREACHED } from "./results-phrases.js";

export const ACCOUNTED_FOR = "Every showtime, accounted for";

interface Named {
  readonly key: string;
  readonly said: string;
}

export interface LedgerRow {
  readonly count: number;
  readonly label: string;
  readonly remedy: string;
  readonly named: readonly Named[];
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
  showtimes: Coverage["soldOut"],
  label: string,
  remedy: string,
): LedgerRow => ({
  ...counted(showtimes.length, label, remedy),
  named: showtimes.map((showtime) => ({
    key: showtime.ticketing,
    said: nameOf(showtime),
  })),
});

const retryIn = (snapshot: Snapshot): string | null =>
  snapshot.phase === "settled" && snapshot.refusedUntil === null
    ? retryOf(snapshot.coverage.failed.length)
    : null;

const notReadYet = (
  refusedUntil: number | null,
  clockAfter: (at: number) => string,
): string =>
  refusedUntil === null
    ? "Not asked for yet. Read more from the list."
    : `The ticket site asked us to slow down. Search again after ${timeOf(clockAfter(refusedUntil))}.`;

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
      "These had begun by the time the listing was read.",
    ),
    named(
      coverage.noSeatMap,
      "No seat map",
      "General admission, so there are no seats to rank. A retry cannot change that.",
    ),
    named(coverage.soldOut, "Sold out", "The room answered: no seats left."),
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
    {
      ...named(
        coverage.failed,
        UNREACHED,
        "The room did not answer. A retry can fix this, and only this.",
      ),
      retry: retryIn(snapshot),
    },
    counted(toGoIn(snapshot), "Being read", "Asked for, not answered yet."),
    counted(
      unreadIn(snapshot),
      "Not read yet",
      notReadYet(snapshot.refusedUntil, clockAfter),
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
