import type { Search, SearchTerms, SeatScout } from "@seatscout/client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Ask } from "./ask.js";
import { Ledger, Strip } from "./coverage.js";
import { type HeldSnapshots, heldSnapshots } from "./held.js";
import { partyOf, whenOf } from "./phrases.js";
import { Results } from "./results.js";
import { queryOf, searchTermsOf, type Terms } from "./terms.js";
import { type Term, TitleCard } from "./title-card.js";

export interface Clock {
  readonly now: () => number;
  readonly subscribe: (tick: () => void) => () => void;
}

interface AppProps {
  readonly seatscout: SeatScout;
  readonly terms: Terms;
  readonly onTerms: (terms: Terms) => void;
  readonly today: string;
  readonly clock: Clock;
}

interface SearchingProps {
  readonly seatscout: SeatScout;
  readonly asked: SearchTerms;
  readonly terms: Terms;
  readonly today: string;
  readonly clock: Clock;
  readonly onEdit: (term: Term) => void;
}

interface Session {
  readonly search: Search;
  readonly held: HeldSnapshots;
}

const opened = (seatscout: SeatScout, asked: SearchTerms): Session => {
  const search = seatscout.search(asked);
  return { search, held: heldSnapshots(search) };
};

const connectionChanges = (tick: () => void) => {
  window.addEventListener("online", tick);
  window.addEventListener("offline", tick);
  return () => {
    window.removeEventListener("online", tick);
    window.removeEventListener("offline", tick);
  };
};

const isOnline = () => navigator.onLine;

const Searching = ({
  seatscout,
  asked,
  terms,
  today,
  clock,
  onEdit,
}: SearchingProps) => {
  const [session, setSession] = useState(() => opened(seatscout, asked));
  const [ledger, setLedger] = useState(false);
  const snapshot = useSyncExternalStore(
    session.held.subscribe,
    session.held.snapshot,
  );
  const now = useSyncExternalStore(clock.subscribe, clock.now);

  useEffect(() => () => session.search.abort(), [session]);

  return (
    <>
      <Strip snapshot={snapshot} onLedger={() => setLedger(true)} />
      <Results
        snapshot={snapshot}
        terms={terms}
        today={today}
        now={now}
        held={session.held}
        onRetry={() => setSession(opened(seatscout, asked))}
        onEdit={onEdit}
      />
      {ledger && (
        <Ledger snapshot={snapshot} onClose={() => setLedger(false)} />
      )}
    </>
  );
};

const Prompt = ({
  terms,
  today,
  onEdit,
}: {
  readonly terms: Terms;
  readonly today: string;
  readonly onEdit: (term: Term) => void;
}) => (
  <section className="verdict">
    <p className="lede">
      Name a movie and an area to search. {partyOf(terms.partySize)},{" "}
      {whenOf(terms.date, today)} and the Reference seat are already set.
    </p>
    <button
      type="button"
      className="btn btn-velvet"
      onClick={() => onEdit(terms.movie === undefined ? "movie" : "area")}
    >
      Find seats
    </button>
  </section>
);

export const App = ({ seatscout, terms, onTerms, today, clock }: AppProps) => {
  const asked = searchTermsOf(terms);
  const [editing, setEditing] = useState<Term | null>(null);
  const online = useSyncExternalStore(connectionChanges, isOnline);

  return (
    <main className="stage">
      {!online && (
        <p className="offline" role="status">
          Offline. Seats are never cached, so nothing here is refreshed until
          the connection returns.
        </p>
      )}
      <div className="screen-band" aria-hidden="true">
        <span className="lamp" />
        <span className="fall" />
        <span className="word">SEATSCOUT</span>
      </div>
      <TitleCard terms={terms} today={today} onEdit={setEditing} />
      {asked === null ? (
        <Prompt terms={terms} today={today} onEdit={setEditing} />
      ) : (
        <Searching
          key={queryOf(terms)}
          seatscout={seatscout}
          asked={asked}
          terms={terms}
          today={today}
          clock={clock}
          onEdit={setEditing}
        />
      )}
      {editing !== null && (
        <Ask
          terms={terms}
          focus={editing}
          onClose={() => setEditing(null)}
          onFind={onTerms}
        />
      )}
    </main>
  );
};
