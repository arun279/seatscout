import "./house.css";
import "./results.css";
import type { Snapshot } from "@seatscout/client";
import type { ReactElement } from "react";
import {
  CHANGE_THE_QUERY,
  emptyOf,
  nameOf,
  notAnAnswerAbout,
  partialOf,
  RETRY_THE_SEARCH,
  retryOf,
  talliesOf,
  type Term,
  type Terms,
  UNREACHED,
  UNREADABLE,
  WIDEN,
} from "@seatscout/view-logic";

interface RemedyProps {
  readonly onRetry: () => void;
  readonly onEdit: (term: Term) => void;
}

const Remedy = ({
  retry,
  onRetry,
  onEdit,
}: RemedyProps & { readonly retry: string }) => (
  <>
    <button type="button" className="btn btn-velvet" onClick={onRetry}>
      {retry}
    </button>
    <button
      type="button"
      className="btn btn-ghost"
      onClick={() => onEdit("movie")}
    >
      {WIDEN}
    </button>
  </>
);

export const Unreachable = ({
  when,
  ...remedy
}: RemedyProps & { readonly when: string }): ReactElement => (
  <section className="verdict">
    <h2 className="display">{UNREADABLE}</h2>
    <p className="lede">{notAnAnswerAbout(when)}</p>
    <div className="fail-box">
      <Remedy {...remedy} retry={RETRY_THE_SEARCH} />
    </div>
  </section>
);

export const Partial = ({
  snapshot,
  ...remedy
}: RemedyProps & { readonly snapshot: Snapshot }): ReactElement => (
  <section className="verdict">
    <h2 className="display">{partialOf(snapshot)}</h2>
    <p className="count-line">
      {talliesOf(snapshot).map((tally) => (
        <span data-unreached={tally.unreached} key={tally.word}>
          <b>{tally.figure}</b>
          {tally.word}
        </span>
      ))}
    </p>
    <div className="fail-box">
      <p className="eyebrow unr">{UNREACHED}</p>
      <ul className="named">
        {snapshot.coverage.failed.map((showtime) => (
          <li key={showtime.id}>
            <span>{nameOf(showtime)}</span>
          </li>
        ))}
      </ul>
      <Remedy {...remedy} retry={retryOf(snapshot.coverage.failed.length)} />
    </div>
  </section>
);

interface EmptyProps {
  readonly snapshot: Snapshot;
  readonly terms: Terms;
  readonly when: string;
  readonly onEdit: (term: Term) => void;
}

export const Empty = ({
  snapshot,
  terms,
  when,
  onEdit,
}: EmptyProps): ReactElement => {
  const nothingListed = snapshot.coverage.candidates === 0;
  const verdict = emptyOf(snapshot, terms, when);

  return (
    <section className="verdict">
      <h2 className="display">{verdict.said}</h2>
      {verdict.ledes.map((lede) => (
        <p className="lede" key={lede}>
          {lede}
        </p>
      ))}
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => onEdit(nothingListed ? "formats" : "partySize")}
      >
        {CHANGE_THE_QUERY}
      </button>
    </section>
  );
};
