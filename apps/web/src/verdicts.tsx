import type { Snapshot } from "@seatscout/client";
import { nameOf } from "./coverage.js";
import { accountOf, unreachedIn } from "./derived.js";
import { noneOf } from "./phrases.js";
import type { Terms } from "./terms.js";
import type { Term } from "./title-card-terms.js";

interface RemedyProps {
  readonly onRetry: () => void;
  readonly onEdit: (term: Term) => void;
}

const Remedy = ({ onRetry, onEdit }: RemedyProps) => (
  <>
    <button type="button" className="btn btn-velvet" onClick={onRetry}>
      Retry the search
    </button>
    <button
      type="button"
      className="btn btn-ghost"
      onClick={() => onEdit("movie")}
    >
      Widen instead: change the query
    </button>
  </>
);

export const Unreachable = ({
  when,
  ...remedy
}: RemedyProps & { readonly when: string }) => (
  <section className="verdict">
    <h2 className="display">The listing could not be read.</h2>
    <p className="lede">
      Nothing was looked at, so this is not an answer about {when}.
    </p>
    <div className="fail-box">
      <Remedy {...remedy} />
    </div>
  </section>
);

export const Partial = ({
  snapshot,
  ...remedy
}: RemedyProps & { readonly snapshot: Snapshot }) => {
  const account = accountOf(snapshot.coverage);
  return (
    <section className="verdict">
      <h2 className="display">
        {snapshot.results.length === 0
          ? `Nothing yet, out of the ${account.checked} rooms that answered.`
          : "Not everywhere yet."}
      </h2>
      <p className="count-line">
        <span>
          <b>{account.candidates}</b>candidates
        </span>
        <span>
          <b>{account.checked}</b>answered
        </span>
        <span className="unr">
          <b>{unreachedIn(snapshot)}</b>unreached
        </span>
      </p>
      <div className="fail-box">
        <p className="eyebrow unr">Could not be reached</p>
        <ul className="named">
          {snapshot.coverage.failed.map((showtime) => (
            <li key={showtime.id}>
              <span>{nameOf(showtime)}</span>
            </li>
          ))}
        </ul>
        <Remedy {...remedy} />
      </div>
    </section>
  );
};

export const NoneAnywhere = ({
  snapshot,
  terms,
  when,
  onEdit,
}: {
  readonly snapshot: Snapshot;
  readonly terms: Terms;
  readonly when: string;
  readonly onEdit: (term: Term) => void;
}) => (
  <section className="verdict">
    <h2 className="display">
      {noneOf(terms.partySize)}, anywhere {when}.
    </h2>
    <p className="lede">
      Every one of the {snapshot.coverage.candidates} candidates has an answer,
      and none of them can seat {terms.partySize} of you in one unbroken run.
    </p>
    <p className="lede">
      Fewer seats together, another day or a wider area would change it.
    </p>
    <button
      type="button"
      className="btn btn-ghost"
      onClick={() => onEdit("partySize")}
    >
      Change the query
    </button>
  </section>
);
