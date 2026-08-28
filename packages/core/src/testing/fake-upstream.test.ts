import { describe, expect, it } from "vitest";
import { seatMapCaptures } from "../corpus/captures.js";
import type { Fetch } from "../transport.js";
import { fakeUpstream, recordedCaptures, routeOf } from "./fake-upstream.js";

const seatMapPaths = () =>
  [...seatMapCaptures.values()].map((capture) => capture.request.path);

const arrivalOrder = async (fetch: Fetch, paths: readonly string[]) => {
  const arrived: string[] = [];

  await Promise.all(
    paths.map((path) => fetch(path).then(() => arrived.push(path))),
  );
  return arrived;
};

const statusesOf = (fetch: Fetch, paths: readonly string[]) =>
  Promise.all(paths.map(async (path) => (await fetch(path)).status));

const tally = (statuses: readonly number[]) => {
  const counts: Record<number, number> = {};
  for (const status of statuses) counts[status] = (counts[status] ?? 0) + 1;
  return counts;
};

describe("the fake upstream", () => {
  it("replays every recorded response, refusals included, at its own route", async () => {
    const captures = recordedCaptures();
    const fetch = fakeUpstream({ seed: 1 });
    const replayed: number[] = [];

    for (const capture of captures) {
      const response = await fetch(capture.request.path);

      expect(JSON.parse(await response.text())).toEqual(capture.body);
      replayed.push(response.status);
    }
    expect(replayed).toEqual(captures.map((capture) => capture.status));
  });

  it("keys every capture on a route of its own", () => {
    const routes = recordedCaptures().map((capture) =>
      routeOf(capture.request.path),
    );

    expect(new Set(routes).size).toBe(routes.length);
  });

  it("carries no response header, because the capture recorded none", async () => {
    const response = await fakeUpstream({ seed: 1 })("/napi/nearbyTheaters");

    expect(response.headers.get("x-upstream-set-cookie")).toBeNull();
  });

  it("refuses a route the corpus never recorded", async () => {
    const fetch = fakeUpstream({ seed: 1 });

    await expect(fetch("/napi/seatMap/000000000")).rejects.toThrow(
      "/napi/seatMap/000000000",
    );
  });

  it("replays one seed's arrival order exactly, and a different seed's differently", async () => {
    const paths = seatMapPaths();
    const arrived = await arrivalOrder(fakeUpstream({ seed: 7 }), paths);

    expect(await arrivalOrder(fakeUpstream({ seed: 7 }), paths)).toEqual(
      arrived,
    );
    expect(await arrivalOrder(fakeUpstream({ seed: 8 }), paths)).not.toEqual(
      arrived,
    );
  });

  it("delivers concurrent requests in a different order from the one they were made in", async () => {
    const paths = seatMapPaths();
    const arrived = await arrivalOrder(fakeUpstream({ seed: 7 }), paths);

    expect(arrived).not.toEqual(paths);
    expect(arrived.toSorted()).toEqual(paths.toSorted());
  });

  it("reorders a fan-out of four into the order its seed decided", async () => {
    const paths = seatMapPaths().slice(0, 4);
    const arrived = await arrivalOrder(fakeUpstream({ seed: 11 }), paths);

    expect(arrived.map((path) => paths.indexOf(path))).toEqual([2, 1, 0, 3]);
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

  it("draws each scripted status at the rate it was scripted at", async () => {
    const paths = Array.from({ length: 24 }, () => seatMapPaths()).flat();
    const scripted = fakeUpstream({
      seed: 5,
      faults: [
        { status: 403, percent: 40 },
        { status: 500, percent: 40 },
      ],
    });

    expect(tally(await statusesOf(scripted, paths))).toEqual({
      200: 201,
      403: 412,
      500: 395,
    });
  });

  it("refuses a fault script that reaches past a hundred percent", () => {
    expect(() =>
      fakeUpstream({
        seed: 1,
        faults: [
          { status: 403, percent: 60 },
          { status: 500, percent: 60 },
        ],
      }),
    ).toThrow("120");
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
