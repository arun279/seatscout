import { createSeatScout, type SeatScout } from "@seatscout/client";

type Fetch = Parameters<typeof createSeatScout>[0]["fetch"];

const UPSTREAM_ORIGIN = "https://www.fandango.com";

const HEADERS: Readonly<Record<string, string>> = {
  Referer: `${UPSTREAM_ORIGIN}/`,
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
};

const padded = (part: number) => `${part}`.padStart(2, "0");

export const listingDate = (at: Date): string =>
  `${at.getFullYear()}-${padded(at.getMonth() + 1)}-${padded(at.getDate())}`;

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
  });
