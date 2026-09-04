import type { Fetch } from "../transport.js";
import { delayAfter, type RetryPolicy } from "./backoff.js";
import { type BreakerPolicy, circuitBreaker } from "./breaker.js";
import { catalogueFrom, theatersFrom } from "./catalogue.js";
import type { Reading, Source, Unreadable } from "./port.js";
import { seatsFrom } from "./seat-map.js";

const THEATERS_ASKED_FOR = 25;

type Refusals = Readonly<Record<number, Unreadable>>;

type Translate<Payload> = (body: string, fetchedAt: number) => Payload | null;

const SEAT_MAP_REFUSALS: Refusals = {
  400: "noSeatMap",
  404: "started",
  410: "soldOut",
};

export type SourcePolicy = RetryPolicy & BreakerPolicy;

const defaultPolicy: SourcePolicy = {
  attempts: 3,
  firstDelayMs: 500,
  failuresBeforeOpening: 3,
  openForMs: 5000,
};

export interface SourceDependencies {
  readonly fetch: Fetch;
  readonly now: () => number;
  readonly wait: (ms: number) => Promise<void>;
  readonly random: () => number;
  readonly policy?: SourcePolicy;
}

interface Answer {
  readonly status: number;
  readonly body: string;
}

export const openSource = (deps: SourceDependencies): Source => {
  const policy = deps.policy ?? defaultPolicy;
  const breaker = circuitBreaker(policy, deps.now);

  const send = async (path: string): Promise<Answer | null> => {
    try {
      const response = await deps.fetch(path, { cache: "no-store" });
      return { status: response.status, body: await response.text() };
    } catch {
      return null;
    }
  };

  const unreachable = (attempts: number): Reading<never> => ({
    ok: false,
    reason: "unreachable",
    fetchedAt: deps.now(),
    attempts,
  });

  const settled = <Payload>(
    answer: Answer | null,
    attempts: number,
    refusals: Refusals,
    translate: Translate<Payload>,
  ): Reading<Payload> | null => {
    if (answer === null) return null;
    const fetchedAt = deps.now();
    if (answer.status !== 200) {
      const reason = refusals[answer.status];
      return reason === undefined
        ? null
        : { ok: false, reason, fetchedAt, attempts };
    }
    const payload = translate(answer.body, fetchedAt);
    return payload === null ? null : { ok: true, payload, fetchedAt, attempts };
  };

  const read = async <Payload>(
    path: string,
    translate: Translate<Payload>,
    refusals: Refusals = {},
  ) => {
    for (let attempt = 1; attempt <= policy.attempts; attempt += 1) {
      if (breaker.refuses()) return unreachable(attempt - 1);
      const answer = await send(path);
      const reading = settled(answer, attempt, refusals, translate);
      if (reading !== null) {
        breaker.succeeded();
        return reading;
      }
      if (attempt < policy.attempts)
        await deps.wait(delayAfter(attempt, policy.firstDelayMs, deps.random));
    }
    breaker.failed();
    return unreachable(policy.attempts);
  };

  return {
    theatersNear: (area) =>
      read(
        `/napi/nearbyTheaters?zipCode=${encodeURIComponent(area)}&limit=${THEATERS_ASKED_FOR}`,
        theatersFrom,
      ),
    showtimesFor: (movie, date, area) =>
      read(
        `/napi/theaterShowtimeGroupings/${encodeURIComponent(movie)}/${encodeURIComponent(date)}?isdesktop=true&isDesktopMOP=true&zip=${encodeURIComponent(area)}&partnerRestrictedTicketing=`,
        catalogueFrom,
      ),
    seatsFor: (showtime) =>
      read(
        `/napi/seatMap/${encodeURIComponent(showtime)}`,
        seatsFrom,
        SEAT_MAP_REFUSALS,
      ),
  };
};
