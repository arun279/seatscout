import "./house.css";
import type { RecentSearch } from "@seatscout/client";
import type { ReactElement } from "react";
import {
  NOTHING_REMEMBERED,
  saidOf,
  type Terms,
  termsOf,
} from "@seatscout/view-logic";

interface RecentProps {
  readonly recent: readonly RecentSearch[];
  readonly today: string;
  readonly heading: string;
  readonly onRun: (terms: Terms) => void;
}

export const Recent = ({
  recent,
  today,
  heading,
  onRun,
}: RecentProps): ReactElement => {
  const offered = recent.filter((search) => search.date >= today);
  return (
    <section className="recent" aria-labelledby="recent-title">
      <h2 id="recent-title" className="eyebrow">
        {heading}
      </h2>
      {offered.length === 0 ? (
        <p className="micro">{NOTHING_REMEMBERED}</p>
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
