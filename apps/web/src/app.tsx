import type {
  RecentSearch,
  Search,
  SearchTerms,
  SeatGroupResult,
  SeatProfile,
  SeatScout,
  TicketingUrl,
} from "@seatscout/client";
import { useState, useSyncExternalStore } from "react";
import { askedFrom } from "./asked.js";
import { Strip } from "./coverage.js";
import { type HeldSnapshots, heldSnapshots } from "./held.js";
import { useOnline } from "./online.js";
import { type Overlays as OverlayState, useOverlays } from "./overlay.js";
import { Overlays } from "./overlays.js";
import { partyOf, seatSetOf, whenOf } from "./phrases.js";
import { Recent } from "./recent.js";
import { type HeldProgramme, programmeNear } from "./programme.js";
import { Results } from "./results.js";
import { queryOf, type Terms } from "./terms.js";
import { TitleCard } from "./title-card.js";
import type { Term } from "./title-card-terms.js";

export interface Clock {
  readonly now: () => number;
  readonly subscribe: (tick: () => void) => () => void;
}

export type Checkout = (ticketing: TicketingUrl) => void;

export interface AppProps {
  readonly seatscout: SeatScout;
  readonly terms: Terms;
  readonly onTerms: (terms: Terms) => void;
  readonly profile: SeatProfile;
  readonly onProfile: (profile: SeatProfile) => void;
  readonly recent: readonly RecentSearch[];
  readonly today: string;
  readonly clock: Clock;
  readonly checkout: Checkout;
}

interface ScreenProps extends AppProps {
  readonly online: boolean;
  readonly held: HeldProgramme;
}

interface SearchingProps {
  readonly seatscout: SeatScout;
  readonly asked: SearchTerms;
  readonly terms: Terms;
  readonly today: string;
  readonly clock: Clock;
  readonly online: boolean;
  readonly overlays: OverlayState;
  readonly onHandOff: (chosen: SeatGroupResult) => void;
}

interface Session {
  readonly search: Search;
  readonly held: HeldSnapshots;
}

const opened = (seatscout: SeatScout, asked: SearchTerms): Session => {
  const search = seatscout.search(asked);
  return { search, held: heldSnapshots(search) };
};

const Searching = ({
  seatscout,
  asked,
  terms,
  today,
  clock,
  online,
  overlays,
  onHandOff,
}: SearchingProps) => {
  const [session] = useState(() => opened(seatscout, asked));
  const snapshot = useSyncExternalStore(
    session.held.subscribe,
    session.held.snapshot,
  );
  const painted = useSyncExternalStore(
    session.held.subscribe,
    session.held.painted,
  );
  const now = useSyncExternalStore(clock.subscribe, clock.now);

  return (
    <>
      <Strip
        snapshot={snapshot}
        onLedger={() => overlays.open({ kind: "ledger", held: session.held })}
      />
      <Results
        snapshot={snapshot}
        painted={painted}
        terms={terms}
        today={today}
        now={now}
        held={session.held}
        online={online}
        onRetry={() => {
          void session.search.retry();
        }}
        onEdit={(focus) => overlays.open({ kind: "ask", focus })}
        onRoom={(result) =>
          overlays.open({ kind: "room", result, search: session.search })
        }
        onHandOff={onHandOff}
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
        Name an area, then a movie playing near it. {partyOf(terms.partySize)},{" "}
        {whenOf(terms.date, today)} and {seatSetOf(profile)} are already set.
      </p>
      <button
        type="button"
        className="btn btn-velvet"
        onClick={() => onEdit(terms.area === undefined ? "area" : "movie")}
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
  held,
  onTerms,
  profile,
  onProfile,
  recent,
  today,
  clock,
  checkout,
  online,
}: ScreenProps) => {
  const asked = askedFrom(terms, profile);
  const overlays = useOverlays();
  const openAsk = (focus: Term) => overlays.open({ kind: "ask", focus });
  const programme = useSyncExternalStore(held.subscribe, held.snapshot);
  const openHandOff = (chosen: SeatGroupResult) =>
    overlays.open({ kind: "handOff", chosen });

  return (
    <>
      <TitleCard
        terms={terms}
        programme={programme}
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
          online={online}
          overlays={overlays}
          onHandOff={openHandOff}
        />
      )}
      <Overlays
        stack={overlays.stack}
        terms={terms}
        programme={held}
        onProgramme={(area, date) => programmeNear(seatscout, area, date)}
        profile={profile}
        recent={recent}
        today={today}
        clock={clock}
        online={online}
        verify={seatscout.verify}
        checkout={checkout}
        onClose={overlays.close}
        onTerms={onTerms}
        onProfile={onProfile}
        onHandOff={openHandOff}
      />
    </>
  );
};

const Playing = ({
  seatscout,
  terms,
  ...rest
}: AppProps & { readonly online: boolean }) => {
  const [held] = useState<HeldProgramme>(() =>
    programmeNear(seatscout, terms.area, terms.date),
  );

  return (
    <Screen
      key={queryOf(terms)}
      seatscout={seatscout}
      terms={terms}
      held={held}
      {...rest}
    />
  );
};

export const App = ({ terms, ...rest }: AppProps) => {
  const online = useOnline();

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
      <Playing
        key={`${terms.area}|${terms.date}`}
        terms={terms}
        online={online}
        {...rest}
      />
    </main>
  );
};
