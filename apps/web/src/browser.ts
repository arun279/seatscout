import { createSeatScout, type SeatScout } from "@seatscout/client";
import type { Clock } from "./app.js";
import { signal } from "./signal.js";
import { browserStore } from "./store.js";

const TICK_MS = 1000;

export interface Address {
  readonly subscribe: (onChange: () => void) => () => void;
  readonly query: () => string;
  readonly go: (query: string) => void;
}

export const browserAddress = (): Address => {
  const changes = signal();
  window.addEventListener("popstate", changes.notify);
  return {
    subscribe: changes.subscribe,
    query: () => window.location.search,
    go: (query) => {
      window.history.pushState(null, document.title, query);
      changes.notify();
    },
  };
};

export const browserClock = (): Clock => {
  let at = Date.now();
  return {
    now: () => at,
    subscribe: (tick) => {
      const ticking = setInterval(() => {
        at = Date.now();
        tick();
      }, TICK_MS);
      return () => clearInterval(ticking);
    },
  };
};

export const browserSeatScout = (): SeatScout =>
  createSeatScout({
    fetch: (url, init) => fetch(url, init),
    store: browserStore(),
    now: Date.now,
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    random: Math.random,
  });
