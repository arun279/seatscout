import {
  createSeatScout,
  type Search,
  type SearchTerms,
  type SeatScout,
} from "@seatscout/client";
import { fakeUpstream, type UpstreamScript } from "@seatscout/client/testing";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { App } from "./app.js";
import type { Terms } from "./terms.js";

export const TODAY = "2026-08-28";
export const LISTING = "/napi/theaterShowtimeGroupings/245569/2026-08-28";
const SEAT_MAP = "/napi/seatMap/";
const STONEBRIAR_4_20 = 558117351;
const STONEBRIAR_6_00 = 558782900;
const FAILING = [STONEBRIAR_4_20, STONEBRIAR_6_00];

export const TONIGHT: Terms = {
  movie: "245569",
  date: TODAY,
  area: "75006",
  partySize: 2,
};

export const ASKED: SearchTerms = {
  movie: "245569",
  date: TODAY,
  area: "75006",
  partySize: 2,
  accessibleSeating: false,
};

interface Staged {
  readonly terms?: Terms;
  readonly script?: Omit<UpstreamScript, "seed" | "standInAuditoriums">;
  readonly holdRetries?: boolean;
}

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
    ...options.script,
  });
  const time = ticking();
  const retries: (() => void)[] = [];
  const real = createSeatScout({
    fetch: upstream,
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
  const seatscout: SeatScout = {
    ...real,
    search: (terms) => {
      asked.push(terms);
      const search = real.search(terms);
      const watched: Search = {
        ...search,
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
  const rendered = render(
    <App
      seatscout={seatscout}
      terms={options.terms ?? TONIGHT}
      onTerms={(terms) => chosen.push(terms)}
      today={TODAY}
      clock={time.clock}
    />,
  );
  return {
    unmount: rendered.unmount,
    asked,
    chosen,
    aborted,
    advance: time.advance,
    resumeRetries: async () => {
      for (const resume of retries.splice(0)) resume();
      await act(() => Promise.resolve());
    },
    settled: async () => {
      const search = searches.at(-1);
      if (search === undefined) throw new Error("no search was opened");
      const snapshot = await search.done;
      await act(() => Promise.resolve());
      return snapshot;
    },
    searches,
  };
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

export const ask = () =>
  within(screen.getByRole("dialog", { name: /what are we seeing/i }));

export const before = (first: Element, second: Element) =>
  (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !==
  0;
