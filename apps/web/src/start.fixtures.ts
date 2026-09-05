import { fakeUpstream } from "@seatscout/client/testing";
import { act, screen, waitFor, within } from "@testing-library/react";
import type { Root } from "react-dom/client";
import { expect, vi } from "vitest";
import { startApp } from "./start.js";

export const SEAT_MAP = "/napi/seatMap/";
export const TONIGHT = "?movie=245569&date=2026-08-28&area=75006&partySize=2";
export const NO_AREA = "?movie=245569&date=2026-08-28&partySize=2";
export const PROFILE = "seatscout.profile.v1";
export const RECENT = "seatscout.recent.v1";
export const ASKED = {
  movie: "245569",
  date: "2026-08-28",
  area: "75006",
  partySize: 2,
};

const running: Root[] = [];

const closed = () =>
  act(() => {
    for (const root of running.splice(0)) root.unmount();
  });

export const opened = async (query: string) => {
  const upstream = fakeUpstream({ seed: 4, standInAuditoriums: true });
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
    cached: () =>
      Object.keys(localStorage).filter((key) =>
        key.startsWith("seatscout.catalogue."),
      ),
  };
};

export const relaunched = async (query: string) => {
  closed();
  return opened(query);
};

export const editor = () =>
  within(screen.getByRole("dialog", { name: /what are we seeing/i }));

export const reset = () => {
  closed();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  localStorage.clear();
};
