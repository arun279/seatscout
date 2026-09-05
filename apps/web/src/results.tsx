import {
  REFERENCE,
  type SeatGroupResult,
  type Snapshot,
} from "@seatscout/client";
import { Fragment } from "react";
import { accountOf, listed, tiedIn, unreachedIn } from "./derived.js";
import type { HeldSnapshots } from "./held.js";
import { ageOf, clockOf, whenOf, whyOf } from "./phrases.js";
import { marksOf } from "./plan.js";
import type { Terms } from "./terms.js";
import type { Term } from "./title-card.js";
import { Empty, Partial, Unreachable } from "./verdicts.js";

interface ResultsProps {
  readonly snapshot: Snapshot;
  readonly painted: Snapshot | null;
  readonly terms: Terms;
  readonly today: string;
  readonly now: number;
  readonly held: HeldSnapshots;
  readonly onRetry: () => void;
  readonly onEdit: (term: Term) => void;
}

interface CardProps {
  readonly result: SeatGroupResult;
  readonly now: number;
}

const Plan = ({ result }: { readonly result: SeatGroupResult }) => {
  const marks = marksOf(
    result.plan,
    result.position,
    result.terms.profile ?? REFERENCE,
  );
  return (
    <svg
      className="plan"
      viewBox="0 0 64 46"
      width="64"
      height="46"
      aria-hidden="true"
    >
      <line x1="14" y1="2.5" x2="50" y2="2.5" className="mp-screen" />
      {marks.rows.map((row) => (
        <line
          key={`${row.y}:${row.x1}`}
          x1={row.x1}
          y1={row.y}
          x2={row.x2}
          y2={row.y}
          className="mp-row"
        />
      ))}
      <circle
        cx={marks.target.cx}
        cy={marks.target.cy}
        r="4.5"
        className="mp-target"
      />
      <circle cx={marks.pair.cx} cy={marks.pair.cy} r="3" className="mp-pair" />
    </svg>
  );
};

const Card = ({ result, now }: CardProps) => {
  const { theater, formats } = result.showtime.presentation;
  const clock = clockOf(result.showtime.startsAt);
  return (
    <li>
      <article
        className="card"
        aria-label={[theater.name, clock, ...formats].join(", ")}
      >
        <Plan result={result} />
        <div className="mid">
          <p className="place">
            {theater.name}
            {formats.map((format) => (
              <span key={format} className="fmt">
                {format}
              </span>
            ))}
          </p>
          <p className="why">
            <span>{clock}</span>
            {" · "}
            <span>{whyOf(result.reasons, result.podDividers)}</span>
            {result.removed.unavailable > 0 && (
              <span className="warn-note">
                {` · ${result.removed.unavailable} of ${result.seatCount} not bookable`}
              </span>
            )}
          </p>
          {result.seats.some((seat) => seat.designation !== "standard") && (
            <p className="designations">
              {result.seats
                .map((seat) => `${seat.id} ${seat.designation}`)
                .join(" · ")}
            </p>
          )}
        </div>
        <div className="side">
          <span className="seats">
            {result.seats.map((seat) => seat.id).join("·")}
          </span>
          <span className="prov">1 source</span>
          <time
            className="age"
            dateTime={new Date(result.fetchedAt).toISOString()}
          >
            {ageOf(result.fetchedAt, now)}
          </time>
        </div>
      </article>
    </li>
  );
};

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
  painted,
  terms,
  today,
  now,
  held,
  onRetry,
  onEdit,
}: ResultsProps) => {
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
