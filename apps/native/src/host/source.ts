import { createSeatScout, type SeatScout } from "@seatscout/client";
import { type HeldProfile, heldProfile } from "./profile.js";
import { deviceStore } from "./store.js";
import { type Fetch, upstream } from "./upstream.js";

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
    fetch: reaching(upstream),
    now: Date.now,
    wait: (ms) => new Promise((done) => setTimeout(done, ms)),
    random: Math.random,
    store: deviceStore,
  });

export const seatscout: SeatScout = deviceSeatScout();

export const seatProfile: HeldProfile = heldProfile(seatscout);
