import type { Coverage, Snapshot } from "@seatscout/client";
import { accountOf } from "./derived.js";
import { modal } from "./modal.js";
import { clockOf } from "./phrases.js";

type Named = Coverage["soldOut"][number];

interface StripProps {
  readonly snapshot: Snapshot;
  readonly onLedger: () => void;
}

interface LedgerProps {
  readonly snapshot: Snapshot;
  readonly onClose: () => void;
}

interface Row {
  readonly count: number;
  readonly label: string;
  readonly remedy: string;
  readonly named: readonly Named[];
  readonly page?: boolean;
  readonly unreached?: boolean;
}

export const nameOf = (showtime: Named) =>
  `${showtime.presentation.theater.name} · ${clockOf(showtime.startsAt)}`;

const stripText = (snapshot: Snapshot) => {
  if (snapshot.phase === "resolving") return "Reading the listing";
  if (snapshot.phase === "unreachable") return "Nothing was read";
  const account = accountOf(snapshot.coverage);
  const counts = `${account.candidates} candidates · ${account.checked} checked`;
  return account.remaining > 0
    ? `${counts} · ${account.remaining} to go`
    : counts;
};

export const Strip = ({ snapshot, onLedger }: StripProps) => (
  <div className="coverage-strip">
    <p role="status">{stripText(snapshot)}</p>
    {snapshot.phase !== "resolving" && snapshot.phase !== "unreachable" && (
      <button
        type="button"
        className="go"
        aria-haspopup="dialog"
        onClick={onLedger}
      >
        ledger ›
      </button>
    )}
  </div>
);

const candidatesRow = (coverage: Coverage): Row => ({
  count: coverage.candidates,
  label: "Candidates",
  remedy: "Showtimes matching your query when the search began.",
  named: [],
});

const outcomeRows = (coverage: Coverage): readonly Row[] => [
  {
    count: coverage.checked,
    label: "Checked",
    remedy:
      "Seat maps fetched and judged. Everything in the list came from these.",
    named: [],
  },
  {
    count: coverage.started.length,
    label: "Already started",
    remedy:
      "The listing was read earlier; these had begun before we looked. Their next screenings are in the list.",
    named: coverage.started,
  },
  {
    count: coverage.noSeatMap.length,
    label: "No seat map",
    remedy:
      "General admission. There is nothing to rank, and retrying can never change that. Buy at the operator's page.",
    named: coverage.noSeatMap,
    page: true,
  },
  {
    count: coverage.soldOut.length,
    label: "Sold out",
    remedy:
      "The room answered: nothing left. Other times at the same Theater remain in the list.",
    named: coverage.soldOut,
  },
  {
    count: coverage.salesOff.length,
    label: "Sales switched off",
    remedy:
      "The listing says the Theater is not selling, so no request is spent. The operator's own page instead.",
    named: coverage.salesOff,
    page: true,
  },
  {
    count: coverage.unidentified.length,
    label: "Never identified",
    remedy:
      "Listed with no identity to ask with, so no check can ever succeed. The operator's own page instead.",
    named: coverage.unidentified,
    page: true,
  },
  {
    count: coverage.failed.length,
    label: "Could not be reached",
    remedy: "The only failure a retry can fix.",
    named: coverage.failed,
    unreached: true,
  },
];

const sumOf = (snapshot: Snapshot) => {
  const account = accountOf(snapshot.coverage);
  const terms = outcomeRows(snapshot.coverage).map((row) => row.count);
  const still = account.remaining > 0 ? [`${account.remaining} to go`] : [];
  const verdict =
    account.remaining > 0 ? "still reading" : "nothing unaccounted";
  return `${[...terms, ...still].join(" + ")} = ${account.candidates} · ${verdict}`;
};

const NamedRows = ({ row }: { readonly row: Row }) => (
  <ul className="named">
    {row.named.map((showtime) => (
      <li key={`${showtime.presentation.theater.id}${showtime.startsAt}`}>
        <span>{nameOf(showtime)}</span>
        {row.page && (
          <a href={showtime.ticketing} target="_blank" rel="noopener">
            operator's page ›
          </a>
        )}
      </li>
    ))}
  </ul>
);

const LedgerRow = ({ row }: { readonly row: Row }) => (
  <li
    aria-label={row.label}
    className={row.unreached ? "ledger-row unr" : "ledger-row"}
  >
    <span className="num">{row.count}</span>
    <div className="col">
      <span className="lab">{row.label}</span>
      <span className="sub">{row.remedy}</span>
      {row.named.length > 0 && <NamedRows row={row} />}
    </div>
  </li>
);

export const Ledger = ({ snapshot, onClose }: LedgerProps) => (
  <dialog
    ref={modal}
    className="ledger"
    aria-labelledby="ledger-title"
    onClose={onClose}
  >
    <form method="dialog">
      <button type="submit" className="back">
        ‹ Back to the list
      </button>
    </form>
    <p className="eyebrow">Coverage</p>
    <h2 id="ledger-title" className="display">
      Every showtime, accounted for.
    </h2>
    <ol className="ledger-rows">
      <LedgerRow row={candidatesRow(snapshot.coverage)} />
      {outcomeRows(snapshot.coverage).map((row) => (
        <LedgerRow key={row.label} row={row} />
      ))}
    </ol>
    <p className="sum-line">{sumOf(snapshot)}</p>
  </dialog>
);
