import "./results.css";
import type { SeatGroupResult, Snapshot } from "@seatscout/client";
import type { ReactElement } from "react";
import { Fragment } from "react";
import { Card } from "./card.js";
import {
  BELOW_THE_TIE,
  headOf,
  type HeldSnapshots,
  listed,
  type Term,
  type Terms,
  tiedIn,
  tiedOf,
  unreachedIn,
  whenOf,
} from "@seatscout/view-logic";
import { Empty, Partial, Unreachable } from "./verdicts.js";

interface ResultsProps {
  readonly snapshot: Snapshot;
  readonly painted: Snapshot | null;
  readonly terms: Terms;
  readonly today: string;
  readonly now: number;
  readonly held: HeldSnapshots;
  readonly online: boolean;
  readonly onRetry: () => void;
  readonly onEdit: (term: Term) => void;
  readonly onRoom: (result: SeatGroupResult) => void;
  readonly onHandOff: (result: SeatGroupResult) => void;
}

const ListHead = ({
  snapshot,
  tie,
}: {
  readonly snapshot: Snapshot;
  readonly tie: boolean;
}) => {
  const head = headOf(snapshot, tie);
  const said = <span className="eyebrow">{head.said}</span>;
  const count = head.count !== null && (
    <span className="eyebrow count">{head.count}</span>
  );
  if (snapshot.phase !== "settled" || unreachedIn(snapshot) > 0)
    return (
      <p className="list-head">
        {said}
        {count}
      </p>
    );
  return (
    <h2 className="list-head">
      {said}
      {count}
    </h2>
  );
};

export const Results = ({
  snapshot,
  painted,
  terms,
  today,
  now,
  held,
  online,
  onRetry,
  onEdit,
  onRoom,
  onHandOff,
}: ResultsProps): ReactElement => {
  const when = whenOf(terms.date, today);
  const settled = snapshot.phase === "settled";
  const results = painted === null ? [] : listed(painted.results);
  const tied = tiedIn(results);
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
        <Empty snapshot={snapshot} terms={terms} when={when} onEdit={onEdit} />
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
                <span className="lbl">{`${tiedOf(tied)} · ${BELOW_THE_TIE}`}</span>
                <span className="beam-line" />
              </li>
            )}
            <Card
              result={result}
              now={now}
              online={online}
              onRoom={onRoom}
              onHandOff={onHandOff}
            />
          </Fragment>
        ))}
      </ol>
    </>
  );
};
