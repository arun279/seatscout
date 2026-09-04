import { describe, expect, it } from "vitest";
import { seatMapCaptures } from "../corpus/captures.js";
import type { Fetch } from "../transport.js";
import { fakeUpstream, recordedCaptures, routeOf } from "./fake-upstream.js";

const seatMapPaths = () =>
  [...seatMapCaptures.values()].map((capture) => capture.request.path);

const arrivalOrder = async (fetch: Fetch, paths: readonly string[]) => {
  const arrived: string[] = [];

  await Promise.all(
    paths.map(async (path) => {
      await (await fetch(path)).text();
      arrived.push(path);
    }),
  );
  return arrived;
};

const statusesOf = (fetch: Fetch, paths: readonly string[]) =>
  Promise.all(
    paths.map(async (path) => {
      const response = await fetch(path);
      await response.text();
      return response.status;
    }),
  );

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
    const faulted = await Promise.all(
      paths.map(async (path) => {
        const response = await always(path);
        return { status: response.status, body: await response.text() };
      }),
    );

    expect(new Set(faulted.map((answer) => answer.status))).toEqual(
      new Set([500]),
    );
    expect(new Set(faulted.map((answer) => answer.body))).toEqual(
      new Set([""]),
    );
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

  it("stands a captured Auditorium in for a seat map the corpus never recorded, the same one every time", async () => {
    const auditoriums = new Set(
      [...seatMapCaptures.values()].map((capture) =>
        JSON.stringify(capture.body),
      ),
    );
    const fetch = fakeUpstream({ seed: 1, standInAuditoriums: true });

    const first = await fetch("/napi/seatMap/000000001");
    const again = await fetch("/napi/seatMap/000000001");
    const other = await fetch("/napi/seatMap/000000002");
    const soldOut = await fetch("/napi/seatMap/561549583");
    const [firstBody, againBody, otherBody] = await Promise.all([
      first.text(),
      again.text(),
      other.text(),
    ]);

    expect([first.status, again.status, other.status]).toEqual([200, 200, 200]);
    expect(auditoriums.has(firstBody)).toBe(true);
    expect(auditoriums.has(otherBody)).toBe(true);
    expect(againBody).toBe(firstBody);
    expect(otherBody).not.toBe(firstBody);
    expect(soldOut.status).toBe(410);
    for (const elsewhere of [
      "/napi/theaterMovies/aacbt",
      "/napi/theaters/561478479",
      "/napi/seatMap/",
      "/napi/seatMap/561478479/extra",
      "/elsewhere/napi/seatMap/561478479",
    ])
      await expect(fetch(elsewhere)).rejects.toThrow(elsewhere);
  });

  it("answers a route the corpus never recorded when the script supplies one", async () => {
    const fetch = fakeUpstream({
      seed: 1,
      routes: {
        "/napi/scripted": { status: 201, body: '{"ok":true}' },
        "/napi/plain": { status: 204 },
      },
    });
    const scripted = await fetch("/napi/scripted");
    const plain = await fetch("/napi/plain?ignored=1");

    expect(scripted.status).toBe(201);
    expect(await scripted.text()).toBe('{"ok":true}');
    expect(plain.status).toBe(204);
    expect(await plain.text()).toBe("");
  });

  it("replaces a recorded route with the one the script supplies", async () => {
    const fetch = fakeUpstream({
      seed: 1,
      routes: { "/napi/nearbyTheaters": { status: 503 } },
    });
    const response = await fetch("/napi/nearbyTheaters?zipCode=75006");

    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
  });

  it("hands a route its scripted statuses in order, then falls back to the capture", async () => {
    const fetch = fakeUpstream({
      seed: 1,
      sequences: { "/napi/nearbyTheaters": [403, 500] },
    });
    const statuses = await statusesOf(fetch, [
      "/napi/nearbyTheaters",
      "/napi/nearbyTheaters",
      "/napi/nearbyTheaters",
    ]);

    expect(statuses).toEqual([403, 500, 200]);
    expect(await statusesOf(fetch, seatMapPaths().slice(0, 2))).toEqual([
      200, 200,
    ]);
  });

  it("takes a scripted sequence over a fault scripted at every request", async () => {
    const fetch = fakeUpstream({
      seed: 1,
      faults: [{ status: 500, percent: 100 }],
      sequences: { "/napi/nearbyTheaters": [403] },
    });

    expect(
      await statusesOf(fetch, ["/napi/nearbyTheaters", "/napi/nearbyTheaters"]),
    ).toEqual([403, 500]);
  });

  it("strips the body a faulted route would otherwise have carried", async () => {
    const fetch = fakeUpstream({
      seed: 1,
      routes: { "/napi/scripted": { status: 200, body: '{"ok":true}' } },
      sequences: { "/napi/scripted": [500] },
    });
    const response = await fetch("/napi/scripted");

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("");
  });

  it("records what each request sent, unrecorded routes included", async () => {
    const fetch = fakeUpstream({ seed: 1 });

    await fetch("/napi/nearbyTheaters?zipCode=75006&limit=25");
    await fetch("/napi/unrecorded", {
      cache: "no-store",
      method: "POST",
      headers: { "Content-Type": "text/plain", Accept: "text/plain" },
      body: "asked=1",
    }).catch(() => undefined);

    expect(fetch.requests).toEqual([
      {
        path: "/napi/nearbyTheaters?zipCode=75006&limit=25",
        method: "GET",
        cache: null,
        headers: {},
        body: null,
      },
      {
        path: "/napi/unrecorded",
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "text/plain", accept: "text/plain" },
        body: "asked=1",
      },
    ]);
  });

  it("leaves arrival order untouched by the faults and sequences scripted alongside it", async () => {
    const paths = seatMapPaths();
    const unscripted = await arrivalOrder(fakeUpstream({ seed: 7 }), paths);

    expect(
      await arrivalOrder(
        fakeUpstream({ seed: 7, faults: [{ status: 500, percent: 40 }] }),
        paths,
      ),
    ).toEqual(unscripted);
    expect(
      await arrivalOrder(
        fakeUpstream({ seed: 7, sequences: { [paths[0] ?? ""]: [500, 500] } }),
        paths,
      ),
    ).toEqual(unscripted);
  });
});
