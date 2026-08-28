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

export interface UpstreamScript {
  readonly seed: number;
  readonly faults?: readonly {
    readonly status: number;
    readonly percent: number;
  }[];
}

interface Arrival {
  readonly arrivesAfter: number;
  readonly resolve: (response: FetchResponse) => void;
  readonly response: FetchResponse;
}

const routeOf = (url: string): string =>
  new URL(url, "https://upstream.invalid").pathname;

const recordedRoutes = (): ReadonlyMap<string, Capture<unknown>> =>
  new Map<string, Capture<unknown>>(
    [
      ...seatMapCaptures.values(),
      ...seatMapFailureCaptures.values(),
      ...showtimeGroupingCaptures.values(),
      ...theaterMovieShowtimesCaptures.values(),
      ...nearbyTheatersCaptures.values(),
    ].map((capture) => [routeOf(capture.request.path), capture]),
  );

export const fakeUpstream = (script: UpstreamScript): Fetch => {
  const routes = recordedRoutes();
  const draws = xoroshiro128plus(script.seed);
  const faultSlots = script.faults?.flatMap((fault) =>
    new Array<number>(fault.percent).fill(fault.status),
  );

  let batch: Arrival[] = [];
  const releaseBatch = () => {
    const arrivals = batch;
    batch = [];
    arrivals.sort((first, second) => first.arrivesAfter - second.arrivesAfter);
    for (const arrival of arrivals) arrival.resolve(arrival.response);
  };

  return (url) => {
    const route = routeOf(url);
    const capture = routes.get(route);
    if (!capture) throw new Error(`no capture was recorded for ${route}`);

    const arrivesAfter = uniformInt(draws, 0, 999);
    const percentile = uniformInt(draws, 0, 99);
    const faulted = faultSlots?.[percentile];
    const { promise, resolve } = Promise.withResolvers<FetchResponse>();

    batch.push({
      arrivesAfter,
      resolve,
      response: {
        status: faulted ?? capture.status,
        text: () =>
          Promise.resolve(
            faulted === undefined ? JSON.stringify(capture.body) : "",
          ),
      },
    });
    void Promise.resolve().then(releaseBatch);

    return promise;
  };
};
