import type { Search, SearchTerms, SeatScout } from "@seatscout/client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Ask } from "./ask.js";
import { Ledger, Strip } from "./coverage.js";
import { type HeldSnapshots, heldSnapshots } from "./held.js";
import { partyOf, whenOf } from "./phrases.js";
import { programmeNear } from "./programme.js";
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

interface QueryProps extends AppProps {
  readonly editing: Term | null;
  readonly onEdit: (term: Term | null) => void;
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
  const [session] = useState(() => opened(seatscout, asked));
  const [ledger, setLedger] = useState(false);
  const snapshot = useSyncExternalStore(
    session.held.subscribe,
    session.held.snapshot,
  );
  const painted = useSyncExternalStore(
    session.held.subscribe,
    session.held.painted,
  );
  const now = useSyncExternalStore(clock.subscribe, clock.now);

  useEffect(() => () => session.search.abort(), [session]);

  return (
    <>
      <Strip snapshot={snapshot} onLedger={() => setLedger(true)} />
      <Results
        snapshot={snapshot}
        painted={painted}
        terms={terms}
        today={today}
        now={now}
        held={session.held}
        onRetry={() => {
          void session.search.retry();
        }}
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
      Name an area, then a movie playing near it. {partyOf(terms.partySize)},{" "}
      {whenOf(terms.date, today)} and the Reference seat are already set.
    </p>
    <button
      type="button"
      className="btn btn-velvet"
      onClick={() => onEdit(terms.area === undefined ? "area" : "movie")}
    >
      Find seats
    </button>
  </section>
);

const Query = ({
  seatscout,
  terms,
  onTerms,
  today,
  clock,
  editing,
  onEdit,
}: QueryProps) => {
  const [programme] = useState(() =>
    programmeNear(seatscout, terms.area, terms.date),
  );
  const playing = useSyncExternalStore(programme.subscribe, programme.snapshot);
  const asked = searchTermsOf(terms);

  return (
    <>
      <TitleCard
        terms={terms}
        programme={playing}
        today={today}
        onEdit={onEdit}
      />
      {asked === null ? (
        <Prompt terms={terms} today={today} onEdit={onEdit} />
      ) : (
        <Searching
          key={queryOf(terms)}
          seatscout={seatscout}
          asked={asked}
          terms={terms}
          today={today}
          clock={clock}
          onEdit={onEdit}
        />
      )}
      {editing !== null && (
        <Ask
          terms={terms}
          programme={programme}
          onProgramme={(area, date) => programmeNear(seatscout, area, date)}
          focus={editing}
          onClose={() => onEdit(null)}
          onFind={onTerms}
        />
      )}
    </>
  );
};

export const App = (props: AppProps) => {
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
      <Query
        key={`${props.terms.area}|${props.terms.date}`}
        {...props}
        editing={editing}
        onEdit={setEditing}
      />
    </main>
  );
};
