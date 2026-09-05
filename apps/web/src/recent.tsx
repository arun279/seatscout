import type { RecentSearch } from "@seatscout/client";
import { dayOf } from "./phrases.js";
import { type Terms, termsOf } from "./terms.js";

interface RecentProps {
  readonly recent: readonly RecentSearch[];
  readonly today: string;
  readonly heading: string;
  readonly onRun: (terms: Terms) => void;
}

const saidOf = (search: RecentSearch, today: string) =>
  [
    `${search.partySize} seat${search.partySize === 1 ? "" : "s"}`,
    dayOf(search.date, today).toLowerCase(),
    search.area,
  ].join(" · ");

export const Recent = ({ recent, today, heading, onRun }: RecentProps) => {
  const offered = recent.filter((search) => search.date >= today);
  return (
    <section className="recent" aria-labelledby="recent-title">
      <h2 id="recent-title" className="eyebrow">
        {heading}
      </h2>
      {offered.length === 0 ? (
        <p className="micro">
          Nothing yet. Searches are kept on this phone once you have run one,
          and never anywhere else.
        </p>
      ) : (
        <ul className="again">
          {offered.map((search) => (
            <li key={JSON.stringify(search)}>
              <button
                type="button"
                className="rerun"
                aria-label={`${search.movie}, ${saidOf(search, today)}`}
                onClick={() => onRun(termsOf(search, today))}
              >
                <span className="display">{search.movie}</span>
                <span className="line">{saidOf(search, today)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
