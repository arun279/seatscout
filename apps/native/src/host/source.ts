import { createSeatScout, type SeatScout } from "@seatscout/client";
import { deviceStore } from "./store.js";

type Fetch = Parameters<typeof createSeatScout>[0]["fetch"];

const UPSTREAM_ORIGIN = "https://www.fandango.com";

const HEADERS: Readonly<Record<string, string>> = {
  Referer: `${UPSTREAM_ORIGIN}/`,
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
};

export const reaching =
  (send: Fetch): Fetch =>
  (path, init) =>
    send(`${UPSTREAM_ORIGIN}${path}`, {
      ...init,
      headers: { ...HEADERS, ...init?.headers },
    });

export const deviceSeatScout = (): SeatScout =>
  createSeatScout({
    fetch: reaching((url, init) => fetch(url, init)),
    now: Date.now,
    wait: (ms) => new Promise((done) => setTimeout(done, ms)),
    random: Math.random,
    store: deviceStore,
  });

export const seatscout: SeatScout = deviceSeatScout();
