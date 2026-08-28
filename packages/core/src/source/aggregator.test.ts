import { describe, expect, it } from "vitest";
import { nearbyTheatersCaptures } from "../corpus/captures.js";
import {
  type FakeUpstream,
  type UpstreamScript,
  fakeUpstream,
} from "../testing/fake-upstream.js";
import { type SourcePolicy, openSource } from "./aggregator.js";
import type { Source } from "./port.js";

const BOOTSTRAP = "/napi/preferences/themes";
const SEAT_MAP = "/napi/seatMap/561748075";
const SESSION = "userlocation=here; usercountry=there";

interface Rig {
  readonly fetch: FakeUpstream;
  readonly waits: number[];
  readonly source: Source;
  readonly at: (moment: number) => void;
}

const rig = (script: Omit<UpstreamScript, "seed">, policy?: SourcePolicy) => {
  const fetch = fakeUpstream({
    seed: 4,
    ...script,
    routes: {
      [BOOTSTRAP]: {
        status: 200,
        headers: { "X-Upstream-Set-Cookie": SESSION },
        body: "{}",
      },
      ...script.routes,
    },
  });
  const waits: number[] = [];
  let clock = 1000;
  const rigged: Rig = {
    fetch,
    waits,
    at: (moment) => {
      clock = moment;
    },
    source: openSource({
      fetch,
      now: () => clock,
      wait: (ms) => {
        waits.push(ms);
        return Promise.resolve();
      },
      random: () => 1,
      policy,
    }),
  };
  return rigged;
};

const pathsOf = (fetch: FakeUpstream) =>
  fetch.requests.map((request) => request.path);

describe("the aggregating source", () => {
  it("opens a session, then reads the route it was asked for", async () => {
    const { fetch, source } = rig({});
    const [capture] = [...nearbyTheatersCaptures.values()];
    const reading = await source.theatersNear("75006");

    expect(reading).toEqual({
      ok: true,
      payload: JSON.stringify(capture?.body),
      fetchedAt: 1000,
      attempts: 1,
    });
    expect(fetch.requests).toEqual([
      {
        path: BOOTSTRAP,
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: "_expiry=1000",
      },
      {
        path: "/napi/nearbyTheaters?zipCode=75006&limit=25",
        method: "GET",
        headers: { "x-upstream-cookie": SESSION },
        body: null,
      },
    ]);
  });

  it("asks for showtimes by movie, date and area", async () => {
    const { fetch, source } = rig({});
    const reading = await source.showtimesFor("245569", "2026-08-28", "75006");

    expect(reading.ok).toBe(true);
    expect(pathsOf(fetch)[1]).toBe(
      "/napi/theaterShowtimeGroupings/245569/2026-08-28?isdesktop=true&isDesktopMOP=true&zip=75006&partnerRestrictedTicketing=",
    );
  });

  it("opens one session for a whole fan-out rather than one for each request", async () => {
    const { fetch, source } = rig({});
    const readings = await Promise.all(
      ["561748075", "561882799", "561565820", "561462741"].map((showtime) =>
        source.seatsFor(showtime),
      ),
    );

    expect(readings.map((reading) => reading.ok)).toEqual([
      true,
      true,
      true,
      true,
    ]);
    expect(pathsOf(fetch).filter((path) => path === BOOTSTRAP)).toHaveLength(1);
  });

  it("names each upstream refusal in domain terms and spends no retry on it", async () => {
    const { fetch, source } = rig({});
    const reasons = await Promise.all(
      ["561442975", "561682781", "561549583"].map(async (showtime) => {
        const reading = await source.seatsFor(showtime);
        return reading.ok ? "read" : reading.reason;
      }),
    );

    expect(reasons).toEqual(["noSeatMap", "started", "soldOut"]);
    expect(fetch.requests).toHaveLength(4);
  });

  it("refreshes the session once when a request is rejected, and the read then succeeds", async () => {
    const { fetch, source, waits } = rig({ sequences: { [SEAT_MAP]: [403] } });
    const reading = await source.seatsFor("561748075");

    expect(reading.ok).toBe(true);
    expect(reading.attempts).toBe(2);
    expect(pathsOf(fetch)).toEqual([BOOTSTRAP, SEAT_MAP, BOOTSTRAP, SEAT_MAP]);
    expect(fetch.requests[3]?.headers).toEqual({
      "x-upstream-cookie": SESSION,
    });
    expect(waits).toEqual([]);
  });

  it("refreshes no second time when the session is rejected again", async () => {
    const { fetch, source } = rig({
      sequences: { [SEAT_MAP]: [403, 403, 403] },
    });
    const reading = await source.seatsFor("561748075");

    expect(reading).toEqual({
      ok: false,
      reason: "unreachable",
      fetchedAt: 1000,
      attempts: 3,
    });
    expect(pathsOf(fetch).filter((path) => path === BOOTSTRAP)).toHaveLength(2);
  });

  it("exhausts retry over a growing backoff and says so rather than reading nothing", async () => {
    const { fetch, source, waits } = rig({
      sequences: { [SEAT_MAP]: [500, 500, 500] },
    });
    const reading = await source.seatsFor("561748075");

    expect(reading).toEqual({
      ok: false,
      reason: "unreachable",
      fetchedAt: 1000,
      attempts: 3,
    });
    expect(waits).toEqual([500, 1000]);
    expect(pathsOf(fetch).filter((path) => path === SEAT_MAP)).toHaveLength(3);
  });

  it("retries a transport that refuses the connection and surfaces it as unreachable", async () => {
    const { fetch, source } = rig({});
    const reading = await source.seatsFor("000000000");

    expect(reading).toEqual({
      ok: false,
      reason: "unreachable",
      fetchedAt: 1000,
      attempts: 3,
    });
    expect(
      pathsOf(fetch).filter((path) => path === "/napi/seatMap/000000000"),
    ).toHaveLength(3);
  });

  it("stops issuing requests once sustained failure trips the circuit, and probes when the break ends", async () => {
    const { fetch, source, at } = rig(
      { sequences: { [SEAT_MAP]: [500, 500] } },
      {
        attempts: 1,
        firstDelayMs: 500,
        failuresBeforeOpening: 2,
        openForMs: 5000,
      },
    );

    expect((await source.seatsFor("561748075")).ok).toBe(false);
    expect((await source.seatsFor("561748075")).ok).toBe(false);
    const issued = fetch.requests.length;

    expect(await source.seatsFor("561748075")).toEqual({
      ok: false,
      reason: "unreachable",
      fetchedAt: 1000,
      attempts: 0,
    });
    expect(fetch.requests).toHaveLength(issued);

    at(6000);
    expect((await source.seatsFor("561748075")).ok).toBe(true);
    expect(fetch.requests).toHaveLength(issued + 1);
  });

  it("counts an answered read, refusal included, as evidence the upstream is up", async () => {
    const other = "/napi/seatMap/561882799";
    const { fetch, source } = rig(
      { sequences: { [SEAT_MAP]: [500], [other]: [500] } },
      {
        attempts: 1,
        firstDelayMs: 500,
        failuresBeforeOpening: 2,
        openForMs: 5000,
      },
    );

    expect((await source.seatsFor("561748075")).ok).toBe(false);
    expect((await source.seatsFor("561549583")).ok).toBe(false);
    expect((await source.seatsFor("561882799")).ok).toBe(false);
    const issued = fetch.requests.length;

    expect((await source.seatsFor("561748075")).ok).toBe(true);
    expect(fetch.requests).toHaveLength(issued + 1);
  });

  it("takes a supplied policy in place of the default", async () => {
    const { source, waits } = rig(
      { sequences: { [SEAT_MAP]: [500, 500] } },
      {
        attempts: 2,
        firstDelayMs: 40,
        failuresBeforeOpening: 9,
        openForMs: 1,
      },
    );
    const reading = await source.seatsFor("561748075");

    expect(reading.attempts).toBe(2);
    expect(waits).toEqual([40]);
  });

  it("reads without a session header when the bootstrap opens no session, and asks once", async () => {
    const { fetch, source } = rig({
      routes: { [BOOTSTRAP]: { status: 200, body: "{}" } },
    });
    const reading = await source.seatsFor("561748075");
    await source.seatsFor("561882799");

    expect(reading.ok).toBe(true);
    expect(fetch.requests[1]?.headers).toEqual({});
    expect(pathsOf(fetch).filter((path) => path === BOOTSTRAP)).toHaveLength(1);
  });

  it("fails the read when no session can be opened rather than reading on regardless", async () => {
    const fetch = fakeUpstream({ seed: 4 });
    const source = openSource({
      fetch,
      now: () => 1000,
      wait: () => Promise.resolve(),
      random: () => 1,
    });
    const reading = await source.theatersNear("75006");

    expect(reading).toEqual({
      ok: false,
      reason: "unreachable",
      fetchedAt: 1000,
      attempts: 3,
    });
    expect(pathsOf(fetch)).toEqual([BOOTSTRAP, BOOTSTRAP, BOOTSTRAP]);
  });
});
