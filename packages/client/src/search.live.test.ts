import { openSource, type Reading } from "@seatscout/core";
import "@seatscout/core/live-context";
import { describe, expect, inject, it } from "vitest";
import { openSearch } from "./search.js";
import { inMemoryStore } from "./store.js";

const SEAT_MAP = "/napi/seatMap/";
const CONCURRENCY = 24;
const MAPS_MEASURED = 48;
const LISTING_MS = 375;
const AT_TWENTY_FOUR_MS = 670;
const AT_TWELVE_MS = 960;
const READING_LIMIT_MS = 120_000;

const reaching =
  (origin: string, headers: Readonly<Record<string, string>>) =>
  (
    path: string,
    init?: {
      readonly cache?: "no-store";
      readonly method?: string;
      readonly headers?: Readonly<Record<string, string>>;
      readonly body?: string;
    },
  ) =>
    fetch(`${origin}${path}`, {
      ...init,
      headers: { ...headers, ...init?.headers },
    });

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
  const statuses: number[] = [];
  const at = Date.now();
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (const path of queue) {
        const response = await reach(path);
        await response.text();
        statuses.push(response.status);
      }
    }),
  );
  return {
    ms: Date.now() - at,
    answered: statuses.filter((status) => status === 200).length,
  };
};

describe("a full search against the live Source", () => {
  it("fans out no slower than the recorded baseline, or than the same responses read raw today", {
    timeout: READING_LIMIT_MS,
  }, async ({ task }) => {
    const live = inject("liveSearch");
    const terms = { movie: live.movie, date: live.date, area: live.area };
    const reader = reaching(live.origin, live.headers);
    task.meta.contract = [
      "the Source did not answer this reader the listing a search starts from",
    ];
    const listed = payloadOf(
      await sourceOn(reader).showtimesFor(terms.movie, terms.date, terms.area),
    );
    const maps = listed.bookable.map((showtime) => `${SEAT_MAP}${showtime.id}`);
    task.meta.contract = [
      "the listing a search starts from offered no bookable Showtime",
    ];
    expect(maps.length).toBeGreaterThan(0);

    const sampled = maps.slice(0, MAPS_MEASURED);
    const raw = await rawly(reader, sampled);

    task.meta.contract = [
      `the Source answered this reader none of the ${sampled.length} seat maps it asked for raw, so this run measured no baseline and judged no search`,
    ];
    expect(raw.answered).toBeGreaterThan(0);

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
      (raw.ms * maps.length * AT_TWELVE_MS) /
        (raw.answered * AT_TWENTY_FOUR_MS),
    );

    task.meta.contract = [
      `a full search over ${maps.length} seat maps ${settled.phase} with ${settled.results.length} ranked results, fanning out in ${fanOut} ms and finishing in ${whole} ms, against a fan-out budget of ${Math.round(allowed)} ms taken from ${raw.answered} of the ${sampled.length} seat maps it read raw`,
    ];

    expect(settled.phase).toBe("settled");
    expect(settled.results.length).toBeGreaterThan(0);
    expect(fanOut).toBeLessThan(allowed);
    expect(whole).toBeLessThan(LISTING_MS + allowed);
  });
});
