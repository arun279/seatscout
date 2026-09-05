import type { Snapshot } from "@seatscout/client";
import { Fragment } from "react";
import { Card } from "./card.js";
import { accountOf, listed, tiedIn, unreachedIn } from "./derived.js";
import type { HeldSnapshots } from "./held.js";
import { whenOf } from "./phrases.js";
import type { Terms } from "./terms.js";
import type { Term } from "./title-card-terms.js";
import { NoneAnywhere, Partial, Unreachable } from "./verdicts.js";

interface ResultsProps {
  readonly snapshot: Snapshot;
  readonly terms: Terms;
  readonly today: string;
  readonly now: number;
  readonly held: HeldSnapshots;
  readonly onRetry: () => void;
  readonly onEdit: (term: Term) => void;
}

const ListHead = ({
  snapshot,
  tie,
}: {
  readonly snapshot: Snapshot;
  readonly tie: boolean;
}) => {
  const account = accountOf(snapshot.coverage);
  if (snapshot.phase !== "settled")
    return (
      <p className="list-head">
        <span className="eyebrow">Reading {account.remaining} seat maps</span>
        <span className="eyebrow count">
          {snapshot.results.length} showtimes so far
        </span>
      </p>
    );
  if (unreachedIn(snapshot) > 0)
    return (
      <p className="list-head">
        <span className="eyebrow">
          From the {account.checked} rooms that answered
        </span>
      </p>
    );
  return (
    <h2 className="list-head">
      <span className="eyebrow">
        {tie ? "The top of the list is a tie" : "Best seats first"}
      </span>
      <span className="eyebrow count">{snapshot.results.length} showtimes</span>
    </h2>
  );
};

export const Results = ({
  snapshot,
  terms,
  today,
  now,
  held,
  onRetry,
  onEdit,
}: ResultsProps) => {
  const when = whenOf(terms.date, today);
  const settled = snapshot.phase === "settled";
  const results = settled ? listed(snapshot.results) : [];
  const tied = tiedIn(snapshot.results);
  const tie = tied > 1;
  const partial = settled && unreachedIn(snapshot) > 0;

  if (snapshot.phase === "unreachable")
    return <Unreachable when={when} onRetry={onRetry} onEdit={onEdit} />;

  return (
    <>
      {partial && (
        <Partial snapshot={snapshot} onRetry={onRetry} onEdit={onEdit} />
      )}
      {settled && !partial && results.length === 0 ? (
        <NoneAnywhere
          snapshot={snapshot}
          terms={terms}
          when={when}
          onEdit={onEdit}
        />
      ) : (
        <ListHead snapshot={snapshot} tie={tie} />
      )}
      <ol
        className="list"
        onPointerDown={held.hold}
        onPointerUp={held.release}
        onPointerCancel={held.release}
        onPointerLeave={held.release}
      >
        {results.map((result, at) => (
          <Fragment key={result.key}>
            {tie && at === tied && (
              <li className="tie-rule">
                <span className="beam-line" />
                <span className="lbl">
                  {tied} tied · below: measurably further
                </span>
                <span className="beam-line" />
              </li>
            )}
            <Card result={result} now={now} />
          </Fragment>
        ))}
      </ol>
    </>
  );
};
