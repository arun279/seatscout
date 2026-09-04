import type { RecentSearch } from "@seatscout/client";
import { dayOf, partyOf } from "./phrases.js";
import { type Terms, termsOf } from "./terms.js";

interface RecentProps {
  readonly recent: readonly RecentSearch[];
  readonly today: string;
  readonly onRun: (terms: Terms) => void;
}

const askedOf = (search: RecentSearch, today: string) => [
  dayOf(search.date, today),
  `Near ${search.area}`,
  partyOf(search.partySize),
];

export const Recent = ({ recent, today, onRun }: RecentProps) => {
  const offered = recent.filter((search) => search.date >= today);
  if (offered.length === 0) return null;
  return (
    <section className="recent" aria-labelledby="recent-title">
      <h2 id="recent-title" className="eyebrow">
        Run again
      </h2>
      <ul className="again">
        {offered.map((search) => (
          <li key={JSON.stringify(search)}>
            <button
              type="button"
              className="rerun"
              aria-label={`${search.movie}, ${askedOf(search, today).join(", ").toLowerCase()}`}
              onClick={() => onRun(termsOf(search, today))}
            >
              <span className="display">{search.movie}</span>
              <span className="line">{askedOf(search, today).join(" · ")}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
