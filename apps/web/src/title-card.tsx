import { dayOf, partyOf } from "./phrases.js";
import type { Terms } from "./terms.js";

export type Term = "partySize" | "movie" | "date" | "area";

interface TitleCardProps {
  readonly terms: Terms;
  readonly today: string;
  readonly onEdit: (term: Term) => void;
}

export const TitleCard = ({ terms, today, onEdit }: TitleCardProps) => (
  <header className="title-card">
    <p className="eyebrow">Your query · tap any line to change it</p>
    <h1 className="display line1">
      <button
        type="button"
        className="term"
        onClick={() => onEdit("partySize")}
      >
        {partyOf(terms.partySize)}
      </button>
    </h1>
    <p className="display line2">
      <button type="button" className="term" onClick={() => onEdit("movie")}>
        {terms.movie ?? "Which movie?"}
      </button>
    </p>
    <p className="line3">
      <button type="button" className="term" onClick={() => onEdit("date")}>
        {dayOf(terms.date, today)}
      </button>
      {" · "}
      <button type="button" className="term" onClick={() => onEdit("area")}>
        {terms.area === undefined ? "Near where?" : `Near ${terms.area}`}
      </button>
      {" · "}
      <span>Any format</span>
      {" · "}
      <span>Reference seat</span>
    </p>
  </header>
);
