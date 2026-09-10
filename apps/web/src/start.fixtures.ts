import { fakeUpstream } from "@seatscout/client/testing";
import { act, screen, waitFor, within } from "@testing-library/react";
import type { Root } from "react-dom/client";
import { expect, vi } from "vitest";
import type { QueryScreen } from "./search.fixtures.js";
import { startApp } from "./start.js";

const SEAT_MAP = "/napi/seatMap/";
const NEARBY = "/napi/nearbyTheaters";

export const PROFILE = "seatscout.profile.v1";
export const RECENT = "seatscout.recent.v1";
export const TONIGHT_QUERY =
  "?movie=245569&date=2026-08-28&area=75006&partySize=2";
export const NO_MOVIE_QUERY = "?date=2026-08-28&area=75006&partySize=2";
export const NO_AREA_QUERY = "?movie=245569&date=2026-08-28&partySize=2";
export const SMALLEST_LISTING_QUERY =
  "?movie=245569&date=2026-08-27&area=75006&partySize=2";
export const SMALLEST_LISTING_NO_AREA_QUERY =
  "?movie=245569&date=2026-08-27&partySize=2";
export const TONIGHT_ASKED = {
  movie: "245569",
  date: "2026-08-28",
  area: "75006",
  partySize: 2,
};
export const SMALLEST_LISTING_ASKED = {
  movie: "245569",
  date: "2026-08-27",
  area: "75006",
  partySize: 2,
};

export interface OpenedApp {
  readonly seatMapsRead: () => number;
  readonly cached: () => string[];
}

const running: Root[] = [];

const closed = () =>
  act(() => {
    for (const root of running.splice(0)) root.unmount();
  });

export const opened = async (query: string): Promise<OpenedApp> => {
  const upstream = fakeUpstream({
    seed: 4,
    standInAuditoriums: true,
    standInTheaters: true,
  });
  vi.stubGlobal("fetch", upstream);
  window.history.replaceState(null, "", `/${query}`);
  document.body.replaceChildren(
    Object.assign(document.createElement("div"), { id: "app" }),
  );
  act(() => {
    void startApp().then((root) => running.push(root));
  });
  await waitFor(() =>
    expect(screen.getByRole("heading", { level: 1 })).toBeVisible(),
  );
  return {
    seatMapsRead: () =>
      upstream.requests.filter((request) => request.path.startsWith(SEAT_MAP))
        .length,
    areasRead: () =>
      upstream.requests.filter((request) => request.path.startsWith(NEARBY))
        .length,
    cached: () =>
      Object.keys(localStorage).filter((key) =>
        key.startsWith("seatscout.catalogue."),
      ),
  };
};

export const relaunched = async (query: string): Promise<OpenedApp> => {
  closed();
  return opened(query);
};

export const editor = (): QueryScreen =>
  within(screen.getByRole("dialog", { name: /what are we seeing/i }));

export const reset = (): void => {
  closed();
  vi.unstubAllGlobals();
  vi.useRealTimers();
};
