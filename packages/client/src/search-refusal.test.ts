import { describe, expect, it } from "vitest";
import { SOURCE_LIMITS } from "./limits.js";
import {
  ACROSS,
  AT,
  LISTING,
  SEAT_MAP,
  searching,
  TODAY,
  WIDTH,
} from "./search.fixtures.js";

const COOLED = AT + SOURCE_LIMITS.refusalCooldownMs;

const refusingEvery = async () => {
  const run = await searching({
    script: { faults: [{ status: 403, percent: 100 }] },
    cached: (catalogue) => ({ fetchedAt: 1000, catalogue }),
  });
  return { run, settled: await run.search.done };
};

describe("a search the Source refuses", () => {
  it("stops at the first refusal, asks no seat map again, and counts nothing it was refused as read", async () => {
    const { run, settled } = await refusingEvery();

    expect(run.requested()).toHaveLength(WIDTH);
    expect(settled.refusedUntil).toBe(COOLED);
    expect(settled.phase).toBe("settled");
    expect(settled.coverage.checked).toBe(0);
    expect(settled.coverage.failed).toEqual([]);
    expect(settled.days).toEqual([
      { date: TODAY, read: 0, reading: 0, unread: 494 },
    ]);
  });

  it("asks for no seat map left in the step once one is refused, and marks every one of them back as not read", async () => {
    const run = await searching({
      answers: (bookable) =>
        Object.fromEntries(
          bookable
            .slice(10)
            .map((showtime) => [`${SEAT_MAP}${showtime.id}`, { status: 403 }]),
        ),
    });
    const settled = await run.search.done;

    expect(run.seatMapsAsked()).toBeLessThan(48);
    expect(settled.days).toEqual([
      { date: TODAY, read: 10, reading: 0, unread: 484 },
    ]);
  });

  it("neither reads more nor retries into the refusal", async () => {
    const { run, settled } = await refusingEvery();

    expect(await run.search.readMore()).toBe(settled);
    expect(await run.search.retry()).toBe(settled);
    expect(run.requested()).toHaveLength(WIDTH);
  });

  it("keeps what it read before the refusal and names the rest as not read yet", async () => {
    const run = await searching({
      answers: (bookable) =>
        Object.fromEntries(
          bookable
            .slice(30)
            .map((showtime) => [`${SEAT_MAP}${showtime.id}`, { status: 403 }]),
        ),
    });
    const settled = await run.search.done;
    const [day] = settled.days;

    expect(settled.refusedUntil).toBe(COOLED);
    expect(settled.coverage.checked).toBe(30);
    expect(settled.results.length).toBeGreaterThan(0);
    expect(day).toEqual({ date: TODAY, read: 30, reading: 0, unread: 464 });
    expect(run.requested().length).toBeLessThan(494);
    expect(await run.search.readMore()).toBe(settled);
  });

  it("says it was refused when one day's listing was refused and another was read", async () => {
    const run = await searching({
      ...ACROSS,
      script: {
        ...ACROSS.script,
        sequences: { [LISTING]: [403] },
      },
    });
    const settled = await run.search.done;

    expect(settled.phase).toBe("unreachable");
    expect(settled.refusedUntil).toBe(COOLED);
  });

  it("stops before any seat map when the listing is refused, and does not ask again", async () => {
    const run = await searching({
      script: { sequences: { [LISTING]: [403, 200] } },
    });
    const settled = await run.search.done;

    const again = await run.search.retry();

    expect(settled.phase).toBe("unreachable");
    expect(settled.refusedUntil).toBe(COOLED);
    expect(again).toBe(settled);
    expect(run.paths()).toEqual([LISTING]);
  });
});
