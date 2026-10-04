import type { Catalogue, Reading, Source } from "@seatscout/core";
import { describe, expect, it } from "vitest";
import { openCooldown } from "./cooldown.js";
import { inMemoryStore, type KeyValueStore } from "./store.js";

const AT = 1000;
const LASTS = 60_000;
const KEY = "seatscout.cooldown.v1";

type Answer = "read" | "refused" | "unreachable";

const EMPTY: Catalogue = { bookable: [], unbookable: [], unidentified: [] };

const answered = <Payload>(
  answer: Answer,
  payload: Payload,
): Reading<Payload> =>
  answer === "read"
    ? { ok: true, payload, fetchedAt: AT, attempts: 1 }
    : { ok: false, reason: answer, fetchedAt: AT, attempts: 1 };

const stub = (answer: Answer = "read") => {
  const asked: string[][] = [];
  const reply = async <Payload>(
    payload: Payload,
    ...args: string[]
  ): Promise<Reading<Payload>> => {
    asked.push(args);
    return answered(answer, payload);
  };
  const source: Source = {
    theatersNear: (area) => reply([], "theatersNear", area),
    moviesAt: (theater, date) => reply([], "moviesAt", theater, date),
    showtimesFor: (movie, date, area) =>
      reply(EMPTY, "showtimesFor", movie, date, area),
    seatsFor: (showtime) => reply([], "seatsFor", showtime),
  };
  return { source, asked };
};

const everyRoute = (source: Source) =>
  Promise.all([
    source.theatersNear("75006"),
    source.moviesAt("5902", "2026-09-20"),
    source.showtimesFor("245893", "2026-09-20", "75006"),
    source.seatsFor("562185322"),
  ]);

const opened = (store: KeyValueStore = inMemoryStore()) => {
  const clock = { at: AT };
  return {
    clock,
    store,
    cooldown: openCooldown({ store, now: () => clock.at, lastsMs: LASTS }),
  };
};

describe("the cooldown after the Source refuses", () => {
  it("passes every route's own arguments through while nothing has been refused", async () => {
    const { source, asked } = stub();
    const { cooldown } = opened();

    const readings = await everyRoute(cooldown.guarded(source));

    expect(readings).toEqual([
      answered("read", []),
      answered("read", []),
      answered("read", EMPTY),
      answered("read", []),
    ]);
    expect(asked).toEqual([
      ["theatersNear", "75006"],
      ["moviesAt", "5902", "2026-09-20"],
      ["showtimesFor", "245893", "2026-09-20", "75006"],
      ["seatsFor", "562185322"],
    ]);
    expect(cooldown.until()).toBe(0);
  });

  it("records the end of the cooldown on the device when a read is refused", async () => {
    const { source } = stub("refused");
    const { cooldown, store, clock } = opened();
    clock.at = 5000;

    expect(await cooldown.guarded(source).seatsFor("562185322")).toEqual(
      answered("refused", []),
    );
    expect(cooldown.until()).toBe(5000 + LASTS);
    expect(await store.read(KEY)).toBe(5000 + LASTS);
  });

  it("records nothing for a read that failed for any other reason", async () => {
    const { source } = stub("unreachable");
    const { cooldown, store } = opened();

    await everyRoute(cooldown.guarded(source));

    expect(cooldown.until()).toBe(0);
    expect(await store.read(KEY)).toBeUndefined();
  });

  it("answers every route refused without asking the Source until the cooldown ends", async () => {
    const refusing = stub("refused");
    const { cooldown, clock } = opened();
    await cooldown.guarded(refusing.source).seatsFor("562185322");
    const { source, asked } = stub();
    clock.at = AT + LASTS - 1;

    const readings = await everyRoute(cooldown.guarded(source));

    expect(readings).toEqual(
      Array(4).fill({
        ok: false,
        reason: "refused",
        fetchedAt: AT + LASTS - 1,
        attempts: 0,
      }),
    );
    expect(asked).toEqual([]);
    expect(cooldown.until()).toBe(AT + LASTS);
  });

  it("asks the Source again the moment the cooldown ends", async () => {
    const refusing = stub("refused");
    const { cooldown, clock } = opened();
    await cooldown.guarded(refusing.source).seatsFor("562185322");
    const { source, asked } = stub();
    clock.at = AT + LASTS;

    expect(await cooldown.guarded(source).seatsFor("562185322")).toEqual(
      answered("read", []),
    );
    expect(asked).toHaveLength(1);
  });

  it("honours a cooldown a cooldown opened earlier over the same store recorded", async () => {
    const store = inMemoryStore();
    await store.write(KEY, AT + LASTS);
    const { source, asked } = stub();
    const { cooldown } = opened(store);

    expect((await cooldown.guarded(source).seatsFor("562185322")).ok).toBe(
      false,
    );
    expect(asked).toEqual([]);
    expect(cooldown.until()).toBe(AT + LASTS);
  });

  it("reads anything but a moment kept under its key as no cooldown at all", async () => {
    const { source, asked } = stub();
    const { cooldown } = opened({
      read: async () => `${AT + LASTS}`,
      write: async () => undefined,
    });

    expect((await cooldown.guarded(source).seatsFor("562185322")).ok).toBe(
      true,
    );
    expect(asked).toHaveLength(1);
  });
});
