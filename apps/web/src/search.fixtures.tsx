import {
  createSeatScout,
  REFERENCE,
  type RecentSearch,
  type Search,
  type SearchTerms,
  type SeatProfile,
  type SeatScout,
  type Snapshot,
  type Verified,
} from "@seatscout/client";
import { fakeUpstream, type UpstreamScript } from "@seatscout/client/testing";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { App, type AppProps } from "./app.js";
import type { ProgrammeState } from "./programme.js";
import type { Terms } from "./terms.js";
import { TODAY, TONIGHT } from "./terms.fixtures.js";

export {
  AT_NO_THEATER,
  AT_ONE_THEATER,
  EVERYTHING,
  NO_MOVIE,
  NOTHING,
  TODAY,
  TONIGHT,
} from "./terms.fixtures.js";

export const LISTING = "/napi/theaterShowtimeGroupings/245569/2026-08-28";
export const NEARBY = "/napi/nearbyTheaters";
export const SCHEDULES = "/napi/theaterMovieShowtimes/";
export const SEAT_MAP = "/napi/seatMap/";
const STONEBRIAR_4_20 = 558117351;
const STONEBRIAR_6_00 = 558782900;
const FAILING = [STONEBRIAR_4_20, STONEBRIAR_6_00];

export const NOTHING_READ: ProgrammeState = {
  phase: "none",
  theaters: [],
  movies: [],
};

export const ASKED: SearchTerms = {
  movie: "245569",
  date: TODAY,
  area: "75006",
  partySize: 2,
  accessibleSeating: false,
  profile: REFERENCE,
};

export const FRONT_ROW: SeatProfile = { ...REFERENCE, targetDepth: 0 };

interface Staged {
  readonly terms?: Terms;
  readonly profile?: SeatProfile;
  readonly recent?: readonly RecentSearch[];
  readonly script?: Omit<
    UpstreamScript,
    "seed" | "standInAuditoriums" | "standInTheaters"
  >;
  readonly holdRetries?: boolean;
}

const Harness = ({
  profile: initial,
  onProfile,
  ...props
}: Omit<AppProps, "today">) => {
  const [profile, setProfile] = useState(initial);
  return (
    <App
      {...props}
      profile={profile}
      onProfile={(next) => {
        onProfile(next);
        setProfile(next);
      }}
      today={TODAY}
    />
  );
};

export interface Room {
  readonly status?: number;
  readonly statuses?: Readonly<Record<string, string>>;
  readonly rest?: string;
}

interface SeatMapBody {
  readonly seats: readonly { readonly id: string; readonly status: string }[];
}

const roomAs = (body: string, room: Room) => {
  const map: SeatMapBody = JSON.parse(body);
  return JSON.stringify({
    ...map,
    seats: map.seats.map((seat) => ({
      ...seat,
      status: room.statuses?.[seat.id] ?? room.rest ?? seat.status,
    })),
  });
};

const ticking = () => {
  const ticks = new Set<() => void>();
  let at = 10_000;
  return {
    clock: {
      now: () => at,
      subscribe: (tick: () => void) => {
        ticks.add(tick);
        return () => ticks.delete(tick);
      },
    },
    advance: (ms: number) => {
      at += ms;
      for (const tick of ticks) tick();
    },
  };
};

export const staged = (options: Staged = {}) => {
  const upstream = fakeUpstream({
    seed: 4,
    standInAuditoriums: true,
    standInTheaters: true,
    ...options.script,
  });
  const time = ticking();
  const retries: (() => void)[] = [];
  const held: (() => void)[] = [];
  let holding = false;
  let room: Room | null = null;
  const fetch: Parameters<typeof createSeatScout>[0]["fetch"] = async (
    url,
    init,
  ) => {
    const answer = await upstream(url, init);
    if (!url.startsWith(SEAT_MAP)) return answer;
    if (holding) await new Promise<void>((resume) => held.push(resume));
    if (room === null) return answer;
    const text = roomAs(await answer.text(), room);
    return {
      status: room.status ?? answer.status,
      text: () => Promise.resolve(text),
    };
  };
  const real = createSeatScout({
    fetch,
    now: time.clock.now,
    wait: () =>
      options.holdRetries
        ? new Promise((resume) => retries.push(resume))
        : Promise.resolve(),
    random: () => 0.5,
  });
  const searches: Search[] = [];
  const aborted: Search[] = [];
  const asked: SearchTerms[] = [];
  const verifications: Promise<Verified>[] = [];
  const settling: Promise<Snapshot>[] = [];
  const programmes: Promise<unknown>[] = [];
  const seatscout: SeatScout = {
    ...real,
    verify: (result) => {
      const pending = real.verify(result);
      verifications.push(pending);
      return pending;
    },
    programme: (area, date) => {
      const programme = real.programme(area, date);
      programmes.push(programme);
      return programme;
    },
    search: (terms) => {
      asked.push(terms);
      const search = real.search(terms);
      settling.push(search.done);
      const watched: Search = {
        ...search,
        retry: () => {
          const retried = search.retry();
          settling.push(retried);
          return retried;
        },
        abort: () => {
          aborted.push(watched);
          search.abort();
        },
      };
      searches.push(watched);
      return watched;
    },
  };
  const chosen: Terms[] = [];
  const profiles: SeatProfile[] = [];
  const checkouts: string[] = [];
  const rendered = render(
    <Harness
      seatscout={seatscout}
      terms={options.terms ?? TONIGHT}
      profile={options.profile ?? REFERENCE}
      recent={options.recent ?? []}
      clock={time.clock}
      onTerms={(terms) => chosen.push(terms)}
      onProfile={(profile) => profiles.push(profile)}
      checkout={(ticketing) => checkouts.push(ticketing)}
    />,
  );
  return {
    unmount: rendered.unmount,
    asked,
    chosen,
    profiles,
    aborted,
    checkouts,
    advance: time.advance,
    roomAtHandOff: (answer: Room) => {
      room = answer;
    },
    holdSeatMaps: () => {
      holding = true;
    },
    releaseSeatMaps: () => {
      holding = false;
      for (const resume of held.splice(0)) resume();
    },
    answered: async () => {
      const verification = verifications.at(-1);
      if (verification === undefined) throw new Error("nothing was verified");
      const verified = await verification;
      await act(() => Promise.resolve());
      return verified;
    },
    verifications,
    requested: (prefix: string) =>
      upstream.requests.filter((request) => request.path.startsWith(prefix))
        .length,
    heldRetries: () => retries.length,
    programmesRead: () => programmes.length,
    resumeRetries: async () => {
      for (const resume of retries.splice(0)) resume();
      await act(() => Promise.resolve());
    },
    programmed: async () => {
      await Promise.all(programmes);
      await act(() => Promise.resolve());
    },
    settled: async () => {
      const last = settling.at(-1);
      if (last === undefined) throw new Error("no search was opened");
      const snapshot = await last;
      await act(() => Promise.resolve());
      return snapshot;
    },
    searches,
  };
};

export const programmeRead = async (): Promise<ProgrammeState> => {
  const reading = await createSeatScout({
    fetch: fakeUpstream({ seed: 4, standInTheaters: true }),
    now: () => 0,
    wait: () => Promise.resolve(),
    random: () => 0.5,
  }).programme("75006", TODAY);
  if (!reading.ok) throw new Error("the corpus would not name what is playing");
  return { phase: "read", ...reading.payload };
};

export const settledAlone = async (options: Staged = {}) => {
  const stage = staged(options);
  const settled = await stage.settled();
  cleanup();
  return settled;
};

export const failing = (statuses: readonly number[]) =>
  Object.fromEntries(FAILING.map((id) => [`${SEAT_MAP}${id}`, statuses]));

export const cards = () => screen.queryAllByRole("article");

export const before = (first: Element, second: Element) =>
  (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !==
  0;

export const ask = () =>
  within(screen.getByRole("dialog", { name: /what are we seeing/i }));
