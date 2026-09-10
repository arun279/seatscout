import "./query.css";
import type { SeatProfile } from "@seatscout/client";
import type { ReactElement } from "react";
import { Fragment } from "react";
import type { ProgrammeState } from "./programme.js";
import type { Terms } from "./terms.js";
import {
  type Term,
  termLinesOf,
  type TitleCardEntry,
} from "./title-card-terms.js";

interface TitleCardProps {
  readonly terms: Terms;
  readonly programme: ProgrammeState;
  readonly profile: SeatProfile;
  readonly today: string;
  readonly onEdit: (term: Term) => void;
}

const Entries = ({
  entries,
  onEdit,
}: {
  readonly entries: readonly TitleCardEntry[];
  readonly onEdit: (term: Term) => void;
}) => (
  <>
    {entries.map((entry, at) => (
      <Fragment key={entry.words}>
        {at > 0 && (entry.joinedBy ?? " · ")}
        <button
          type="button"
          className="term"
          onClick={() => onEdit(entry.term)}
        >
          {entry.words}
        </button>
      </Fragment>
    ))}
  </>
);

export const TitleCard = ({
  terms,
  programme,
  profile,
  today,
  onEdit,
}: TitleCardProps): ReactElement => {
  const [party, movie, details] = termLinesOf(terms, programme, today, profile);
  return (
    <header className="title-card">
      <p className="eyebrow">Your query · tap any line to change it</p>
      <h1 className="display line1">
        <Entries entries={party} onEdit={onEdit} />
      </h1>
      <p className="display line2">
        <Entries entries={movie} onEdit={onEdit} />
      </p>
      <p className="line3">
        <Entries entries={details} onEdit={onEdit} />
      </p>
    </header>
  );
};
