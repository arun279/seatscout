import { uniformInt } from "pure-rand/distribution/uniformInt";
import { xoroshiro128plus } from "pure-rand/generator/xoroshiro128plus";
import {
  nearbyTheatersCaptures,
  seatMapCaptures,
  seatMapFailureCaptures,
  showtimeGroupingCaptures,
  theaterMovieShowtimesCaptures,
} from "../corpus/captures.js";
import type { Capture } from "../corpus/types.js";
import type { Fetch, FetchResponse } from "../transport.js";

export { seatMapCaptures };

interface ScriptedRoute {
  readonly status: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
}

export interface UpstreamScript {
  readonly seed: number;
  readonly faults?: readonly {
    readonly status: number;
    readonly percent: number;
  }[];
  readonly routes?: Readonly<Record<string, ScriptedRoute>>;
  readonly sequences?: Readonly<Record<string, readonly number[]>>;
}

interface RecordedRequest {
  readonly path: string;
  readonly method: string;
  readonly cache: "no-store" | null;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string | null;
}

export type FakeUpstream = Fetch & {
  readonly requests: readonly RecordedRequest[];
};

interface Content {
  readonly headers: Readonly<Record<string, string>>;
  readonly body: () => string;
}

interface Replay extends Content {
  readonly status: number;
}

interface Arrival {
  readonly arrivesAfter: number;
  readonly resolve: (response: FetchResponse) => void;
  readonly response: FetchResponse;
}

const OVERRIDDEN: Content = { headers: {}, body: () => "" };

const lowercased = (headers: Readonly<Record<string, string>>) =>
  Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  );

export const routeOf = (url: string): string =>
  new URL(url, "https://upstream.invalid").pathname;

export const recordedCaptures = (): readonly Capture<unknown>[] => [
  ...seatMapCaptures.values(),
  ...seatMapFailureCaptures.values(),
  ...showtimeGroupingCaptures.values(),
  ...theaterMovieShowtimesCaptures.values(),
  ...nearbyTheatersCaptures.values(),
];

export const fakeUpstream = (script: UpstreamScript): FakeUpstream => {
  const draws = xoroshiro128plus(script.seed);
  const replays = new Map<string, Replay>(
    recordedCaptures().map((capture) => [
      routeOf(capture.request.path),
      {
        status: capture.status,
        headers: {},
        body: () => JSON.stringify(capture.body),
      },
    ]),
  );
  for (const [path, route] of Object.entries(script.routes ?? {}))
    replays.set(routeOf(path), {
      status: route.status,
      headers: lowercased(route.headers ?? {}),
      body: () => route.body ?? "",
    });

  const sequences = new Map<string, number[]>(
    Object.entries(script.sequences ?? {}).map(([path, statuses]) => [
      routeOf(path),
      [...statuses],
    ]),
  );
  const faultSlots = script.faults?.flatMap((fault) =>
    new Array<number>(fault.percent).fill(fault.status),
  );
  if (faultSlots && faultSlots.length > 100)
    throw new Error(
      `a fault script may not exceed a hundred percent; this one reaches ${faultSlots.length}`,
    );

  const requests: RecordedRequest[] = [];
  let batch: Arrival[] = [];
  const releaseBatch = () => {
    const arrivals = batch;
    batch = [];
    arrivals.sort((first, second) => first.arrivesAfter - second.arrivesAfter);
    for (const arrival of arrivals) arrival.resolve(arrival.response);
  };

  const upstream: Fetch = (url, init) => {
    const route = routeOf(url);
    requests.push({
      path: url,
      method: init?.method ?? "GET",
      cache: init?.cache ?? null,
      headers: lowercased(init?.headers ?? {}),
      body: init?.body ?? null,
    });
    const replay = replays.get(route);
    if (!replay)
      return Promise.reject(new Error(`no capture was recorded for ${route}`));

    const arrivesAfter = uniformInt(draws, 0, 999);
    const percentile = uniformInt(draws, 0, 99);
    const overridden =
      sequences.get(route)?.shift() ?? faultSlots?.[percentile];
    const answer = overridden === undefined ? replay : OVERRIDDEN;
    const { promise, resolve } = Promise.withResolvers<FetchResponse>();

    batch.push({
      arrivesAfter,
      resolve,
      response: {
        status: overridden ?? replay.status,
        headers: {
          get: (name) => answer.headers[name.toLowerCase()] ?? null,
        },
        text: () => Promise.resolve(answer.body()),
      },
    });
    void Promise.resolve().then(releaseBatch);

    return promise;
  };

  return Object.assign(upstream, { requests });
};
