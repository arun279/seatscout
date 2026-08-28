import { describe, expect, it } from "vitest";
import {
  nearbyTheatersCaptures,
  seatMapCaptures,
  seatMapFailureCaptures,
  showtimeGroupingCaptures,
  theaterMovieShowtimesCaptures,
} from "../corpus/captures.js";
import type { Fetch } from "../transport.js";
import { fakeUpstream } from "./fake-upstream.js";

const everyCapture = () => [
  ...seatMapCaptures.values(),
  ...seatMapFailureCaptures.values(),
  ...showtimeGroupingCaptures.values(),
  ...theaterMovieShowtimesCaptures.values(),
  ...nearbyTheatersCaptures.values(),
];

const seatMapPaths = () =>
  [...seatMapCaptures.values()].map((capture) => capture.request.path);

const arrivalOrder = async (fetch: Fetch, paths: readonly string[]) => {
  const arrived: string[] = [];

  await Promise.all(
    paths.map((path) => fetch(path).then(() => arrived.push(path))),
  );
  return arrived;
};

const statusesOf = async (fetch: Fetch, paths: readonly string[]) =>
  await Promise.all(paths.map(async (path) => (await fetch(path)).status));

describe("the fake upstream", () => {
  it("replays every recorded response, refusals included, at its own route", async () => {
    const captures = everyCapture();
    const fetch = fakeUpstream({ seed: 1 });
    const replayed: number[] = [];

    for (const capture of captures) {
      const response = await fetch(capture.request.path);

      expect(JSON.parse(await response.text())).toEqual(capture.body);
      replayed.push(response.status);
    }
    expect(replayed).toEqual(captures.map((capture) => capture.status));
  });

  it("refuses a route the corpus never recorded", () => {
    const fetch = fakeUpstream({ seed: 1 });

    expect(() => fetch("/napi/seatMap/000000000")).toThrow(
      "/napi/seatMap/000000000",
    );
  });

  it("replays one seed's arrival order exactly, and a different seed's differently", async () => {
    const paths = seatMapPaths();

    expect(await arrivalOrder(fakeUpstream({ seed: 7 }), paths)).toEqual(
      await arrivalOrder(fakeUpstream({ seed: 7 }), paths),
    );
    expect(await arrivalOrder(fakeUpstream({ seed: 7 }), paths)).not.toEqual(
      await arrivalOrder(fakeUpstream({ seed: 8 }), paths),
    );
  });

  it("delivers concurrent requests in an order unrelated to the order they were made", async () => {
    const paths = seatMapPaths();
    const arrived = await arrivalOrder(fakeUpstream({ seed: 7 }), paths);

    expect(arrived).not.toEqual(paths);
    expect(arrived.toSorted()).toEqual(paths.toSorted());
  });

  it("faults every request at a hundred percent, with no body, and none at zero", async () => {
    const paths = seatMapPaths();
    const always = fakeUpstream({
      seed: 3,
      faults: [{ status: 500, percent: 100 }],
    });
    const never = fakeUpstream({
      seed: 3,
      faults: [{ status: 500, percent: 0 }],
    });
    const faulted = await Promise.all(paths.map((path) => always(path)));

    expect(new Set(faulted.map((response) => response.status))).toEqual(
      new Set([500]),
    );
    expect(
      new Set(await Promise.all(faulted.map((response) => response.text()))),
    ).toEqual(new Set([""]));
    expect(new Set(await statusesOf(never, paths))).toEqual(new Set([200]));
  });

  it("draws each scripted status at its own rate, and replays the rest", async () => {
    const scripted = fakeUpstream({
      seed: 5,
      faults: [
        { status: 403, percent: 40 },
        { status: 500, percent: 40 },
      ],
    });

    expect(new Set(await statusesOf(scripted, seatMapPaths()))).toEqual(
      new Set([200, 403, 500]),
    );
  });

  it("leaves arrival order untouched by the faults scripted alongside it", async () => {
    const paths = seatMapPaths();

    expect(
      await arrivalOrder(
        fakeUpstream({ seed: 7, faults: [{ status: 500, percent: 40 }] }),
        paths,
      ),
    ).toEqual(await arrivalOrder(fakeUpstream({ seed: 7 }), paths));
  });
});
