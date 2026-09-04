import type {
  RecentSearch,
  Search,
  SearchTerms,
  SeatProfile,
  SeatScout,
} from "@seatscout/client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { askedFrom } from "./asked.js";
import { Strip } from "./coverage.js";
import { type HeldSnapshots, heldSnapshots } from "./held.js";
import { type Overlays as OverlayState, useOverlays } from "./overlay.js";
import { Overlays } from "./overlays.js";
import { partyOf, seatSetOf, whenOf } from "./phrases.js";
import { Recent } from "./recent.js";
import { Results } from "./results.js";
import { queryOf, type Terms } from "./terms.js";
import { TitleCard } from "./title-card.js";
import type { Term } from "./title-card-terms.js";

export interface Clock {
  readonly now: () => number;
  readonly subscribe: (tick: () => void) => () => void;
}

export interface AppProps {
  readonly seatscout: SeatScout;
  readonly terms: Terms;
  readonly onTerms: (terms: Terms) => void;
  readonly profile: SeatProfile;
  readonly onProfile: (profile: SeatProfile) => void;
  readonly recent: readonly RecentSearch[];
  readonly today: string;
  readonly clock: Clock;
}

interface SearchingProps {
  readonly seatscout: SeatScout;
  readonly asked: SearchTerms;
  readonly terms: Terms;
  readonly today: string;
  readonly clock: Clock;
  readonly overlays: OverlayState;
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
  overlays,
}: SearchingProps) => {
  const [session, setSession] = useState(() => opened(seatscout, asked));
  const snapshot = useSyncExternalStore(
    session.held.subscribe,
    session.held.snapshot,
  );
  const now = useSyncExternalStore(clock.subscribe, clock.now);

  useEffect(() => () => session.search.abort(), [session]);

  return (
    <>
      <Strip
        snapshot={snapshot}
        onLedger={() => overlays.open({ kind: "ledger", held: session.held })}
      />
      <Results
        snapshot={snapshot}
        terms={terms}
        today={today}
        now={now}
        held={session.held}
        onRetry={() => setSession(opened(seatscout, asked))}
        onEdit={(focus) => overlays.open({ kind: "ask", focus })}
        onRoom={(result) =>
          overlays.open({ kind: "room", result, search: session.search })
        }
      />
    </>
  );
};

const Prompt = ({
  terms,
  profile,
  recent,
  today,
  onEdit,
  onTerms,
}: {
  readonly terms: Terms;
  readonly profile: SeatProfile;
  readonly recent: readonly RecentSearch[];
  readonly today: string;
  readonly onEdit: (term: Term) => void;
  readonly onTerms: (terms: Terms) => void;
}) => (
  <>
    <section className="verdict">
      <p className="lede">
        Name a movie and an area to search. {partyOf(terms.partySize)},{" "}
        {whenOf(terms.date, today)} and {seatSetOf(profile)} are already set.
      </p>
      <button
        type="button"
        className="btn btn-velvet"
        onClick={() => onEdit(terms.movie === undefined ? "movie" : "area")}
      >
        Find seats
      </button>
    </section>
    <Recent recent={recent} today={today} heading="Run again" onRun={onTerms} />
  </>
);

const Screen = ({
  seatscout,
  terms,
  onTerms,
  profile,
  onProfile,
  recent,
  today,
  clock,
}: AppProps) => {
  const asked = askedFrom(terms, profile);
  const overlays = useOverlays();
  const openAsk = (focus: Term) => overlays.open({ kind: "ask", focus });

  return (
    <>
      <TitleCard
        terms={terms}
        profile={profile}
        today={today}
        onEdit={openAsk}
      />
      {asked === null ? (
        <Prompt
          terms={terms}
          profile={profile}
          recent={recent}
          today={today}
          onEdit={openAsk}
          onTerms={onTerms}
        />
      ) : (
        <Searching
          key={JSON.stringify(asked)}
          seatscout={seatscout}
          asked={asked}
          terms={terms}
          today={today}
          clock={clock}
          overlays={overlays}
        />
      )}
      <Overlays
        stack={overlays.stack}
        terms={terms}
        profile={profile}
        recent={recent}
        today={today}
        clock={clock}
        onClose={overlays.close}
        onTerms={onTerms}
        onProfile={onProfile}
        onHandOff={seatscout.verify}
      />
    </>
  );
};

export const App = ({ terms, ...rest }: AppProps) => {
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
      <Screen key={queryOf(terms)} terms={terms} {...rest} />
    </main>
  );
};
