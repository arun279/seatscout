import { narrowed } from "@seatscout/core";
import { describe, expect, it } from "vitest";
import {
  accountedIn,
  LISTING,
  listing,
  SEAT_MAP,
  STONEBRIAR,
  searching,
  theaterIn,
} from "./search.fixtures.js";

const refusing = async (count: number) => {
  const listed = await listing();
  const refused = narrowed(listed, {
    theaters: [theaterIn(listed, STONEBRIAR)],
  }).bookable.slice(0, count);
  const run = await searching({
    at: [STONEBRIAR],
    script: {
      sequences: Object.fromEntries(
        refused.map((showtime) => [
          `${SEAT_MAP}${showtime.id}`,
          [500, 500, 500],
        ]),
      ),
    },
  });
  return { refused, run, settled: await run.search.done };
};

describe("retrying a search", () => {
  it("re-checks only the Showtimes it could not reach, once each, and the ledger moves them to checked", async () => {
    const { refused, run, settled } = await refusing(2);
    const asked = run.requested().length;

    const again = await run.search.retry();

    expect(settled.coverage.failed).toEqual(refused);
    expect(settled.coverage.checked).toBe(2);
    expect(run.requested().slice(asked)).toEqual(
      refused.map((showtime) => showtime.id),
    );
    expect(again.coverage.failed).toEqual([]);
    expect(again.coverage.checked).toBe(4);
    expect(again.results).toHaveLength(4);
    expect(again.phase).toBe("settled");
    expect(run.search.snapshot()).toBe(again);
  });

  it("counts a Showtime being retried as not reached until it answers, so the ledger stays closed", async () => {
    const { run, settled } = await refusing(2);
    const seen = run.snapshots.length;

    const again = await run.search.retry();
    const during = run.snapshots.slice(seen);

    expect(during.map((snapshot) => snapshot.phase)).toEqual([
      "searching",
      "searching",
      "searching",
      "settled",
    ]);
    expect(during[0]?.coverage.failed).toEqual([]);
    expect(during[0]?.coverage.checked).toBe(2);
    expect(
      during.map(
        (snapshot) =>
          snapshot.coverage.candidates - accountedIn(snapshot.coverage),
      ),
    ).toEqual([2, 1, 0, 0]);
    expect(settled.results.length).toBeLessThan(again.results.length);
  });

  it("names again a Showtime that still cannot be reached, having spent the retries on it once more", async () => {
    const listed = await listing();
    const [refused] = narrowed(listed, {
      theaters: [theaterIn(listed, STONEBRIAR)],
    }).bookable;
    if (refused === undefined) throw new Error("nothing to refuse");
    const run = await searching({
      at: [STONEBRIAR],
      script: {
        sequences: {
          [`${SEAT_MAP}${refused.id}`]: [500, 500, 500, 500, 500, 500],
        },
      },
    });
    await run.search.done;
    const asked = run.requested().length;

    const again = await run.search.retry();

    expect(run.requested().slice(asked)).toEqual([
      refused.id,
      refused.id,
      refused.id,
    ]);
    expect(again.coverage.failed).toEqual([refused]);
    expect(again.coverage.checked).toBe(3);
  });

  it("re-reads the listing when it was the listing that could not be read", async () => {
    const run = await searching({
      script: { sequences: { [LISTING]: [500, 500, 500] } },
    });
    const settled = await run.search.done;

    const again = await run.search.retry();

    expect(settled.phase).toBe("unreachable");
    expect(again.phase).toBe("settled");
    expect(again.coverage.candidates).toBe(176);
    expect(again.coverage.checked).toBe(172);
  });

  it("answers the search in flight rather than starting another while it is still running", async () => {
    const run = await searching({ at: [STONEBRIAR] });

    const retried = run.search.retry();
    const settled = await run.search.done;

    expect(await retried).toBe(settled);
    expect(run.requested()).toHaveLength(4);
  });

  it("issues nothing once it has been aborted", async () => {
    const { run } = await refusing(2);
    const asked = run.requested().length;
    run.search.abort();

    const again = await run.search.retry();

    expect(run.requested()).toHaveLength(asked);
    expect(again.phase).toBe("settled");
  });
});
