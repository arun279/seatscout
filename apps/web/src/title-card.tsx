import { Fragment } from "react";
import {
  type Term,
  type TitleCardEntry,
  type TitleCardLine,
  termLinesOf,
} from "./title-card-terms.js";
import type { Terms } from "./terms.js";

interface TitleCardProps {
  readonly terms: Terms;
  readonly today: string;
  readonly onEdit: (term: Term) => void;
}

const Entry = ({
  entry,
  onEdit,
}: {
  readonly entry: TitleCardEntry;
  readonly onEdit: (term: Term) => void;
}) => {
  const { term } = entry;
  return term === undefined ? (
    <span>{entry.words}</span>
  ) : (
    <button type="button" className="term" onClick={() => onEdit(term)}>
      {entry.words}
    </button>
  );
};

const Entries = ({
  line,
  onEdit,
}: {
  readonly line: TitleCardLine;
  readonly onEdit: (term: Term) => void;
}) => (
  <>
    {line.entries.map((entry, at) => (
      <Fragment key={entry.term ?? entry.words}>
        {at > 0 && " · "}
        <Entry entry={entry} onEdit={onEdit} />
      </Fragment>
    ))}
  </>
);

const Line = ({
  line,
  onEdit,
}: {
  readonly line: TitleCardLine;
  readonly onEdit: (term: Term) => void;
}) => {
  const entries = <Entries line={line} onEdit={onEdit} />;
  switch (line.kind) {
    case "party":
      return <h1 className="display line1">{entries}</h1>;
    case "movie":
      return <p className="display line2">{entries}</p>;
    case "details":
      return <p className="line3">{entries}</p>;
  }
};

export const TitleCard = ({ terms, today, onEdit }: TitleCardProps) => (
  <header className="title-card">
    <p className="eyebrow">Your query · tap any line to change it</p>
    {termLinesOf(terms, today).map((line) => (
      <Line key={line.kind} line={line} onEdit={onEdit} />
    ))}
  </header>
);
