import { type Reading, openSource } from "@seatscout/core";
import { describe, expect, inject, it } from "vitest";
import { openSearch } from "./search.js";
import { inMemoryStore } from "./store.js";

declare module "vitest" {
  interface ProvidedContext {
    readonly liveSearch: {
      readonly origin: string;
      readonly area: string;
      readonly movie: string;
      readonly date: string;
      readonly headers: Readonly<Record<string, string>>;
    };
  }
}

const SEAT_MAP = "/napi/seatMap/";
const CONCURRENCY = 24;
const MAPS_MEASURED = 48;
const BOOTSTRAP_MS = 209;
const LISTING_MS = 375;
const AT_TWENTY_FOUR_MS = 670;
const AT_TWELVE_MS = 960;
const READING_LIMIT_MS = 120_000;

const reaching = (
  origin: string,
  headers: Readonly<Record<string, string>>,
) => {
  let session = "";
  return async (
    path: string,
    init?: {
      readonly method?: string;
      readonly headers?: Readonly<Record<string, string>>;
      readonly body?: string;
    },
  ) => {
    const response = await fetch(`${origin}${path}`, {
      method: init?.method,
      headers: {
        ...headers,
        ...init?.headers,
        ...(session === "" ? {} : { Cookie: session }),
      },
      body: init?.body,
    });
    const opened = response.headers
      .getSetCookie()
      .map((raw) => raw.split(";")[0] ?? raw);
    if (opened.length > 0) session = opened.join("; ");
    return response;
  };
};

const sourceOn = (reach: ReturnType<typeof reaching>) =>
  openSource({
    fetch: reach,
    now: Date.now,
    wait: (ms: number) => new Promise<void>((done) => setTimeout(done, ms)),
    random: Math.random,
  });

const payloadOf = <Found>(reading: Reading<Found>): Found => {
  if (!reading.ok) throw new Error(`the Source answered ${reading.reason}`);
  return reading.payload;
};

const rawly = async (
  reach: ReturnType<typeof reaching>,
  paths: readonly string[],
) => {
  const queue = paths[Symbol.iterator]();
  const at = Date.now();
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (const path of queue) await (await reach(path)).text();
    }),
  );
  return Date.now() - at;
};

describe("a full search against the live Source", () => {
  it("fans out no slower than the recorded baseline, or than the same responses read raw today", {
    timeout: READING_LIMIT_MS,
  }, async () => {
    const live = inject("liveSearch");
    const terms = { movie: live.movie, date: live.date, area: live.area };
    const warm = reaching(live.origin, live.headers);
    const listed = payloadOf(
      await sourceOn(warm).showtimesFor(terms.movie, terms.date, terms.area),
    );
    const maps = listed.bookable.map((showtime) => `${SEAT_MAP}${showtime.id}`);
    const raw = await rawly(warm, maps);

    const marks: number[] = [];
    const started = Date.now();
    const search = openSearch({
      source: sourceOn(reaching(live.origin, live.headers)),
      store: inMemoryStore(),
      now: Date.now,
    })({ ...terms, partySize: 2, accessibleSeating: false });
    search.subscribe(() => marks.push(Date.now()));
    const settled = await search.done;
    const whole = Date.now() - started;
    const fanOut = (marks.at(-1) ?? 0) - (marks[0] ?? 0);
    const allowed = Math.max(
      (AT_TWENTY_FOUR_MS * maps.length) / MAPS_MEASURED,
      (raw * AT_TWELVE_MS) / AT_TWENTY_FOUR_MS,
    );

    expect(settled.phase).toBe("settled");
    expect(settled.results.length).toBeGreaterThan(0);
    expect(maps.length).toBeGreaterThan(0);
    expect(fanOut).toBeLessThan(allowed);
    expect(whole).toBeLessThan(BOOTSTRAP_MS + LISTING_MS + allowed);
  });
});
