import type { Fetch } from "../transport.js";
import { type RetryPolicy, delayAfter } from "./backoff.js";
import { type BreakerPolicy, circuitBreaker } from "./breaker.js";
import type { Reading, Source, Unreadable } from "./port.js";

const BOOTSTRAP = "/napi/preferences/themes";
const BOOTSTRAP_FORM = "application/x-www-form-urlencoded; charset=UTF-8";
const UPSTREAM_COOKIE = "x-upstream-cookie";
const UPSTREAM_SET_COOKIE = "x-upstream-set-cookie";
const THEATERS_ASKED_FOR = 25;

type Refusals = Readonly<Record<number, Unreadable>>;

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

const rejected = (answer: Answer | null) =>
  answer !== null && answer.status === 403;

export const openSource = (deps: SourceDependencies): Source => {
  const policy = deps.policy ?? defaultPolicy;
  const breaker = circuitBreaker(policy, deps.now);
  let session: string | null = null;
  let sessionOpened = false;
  let openingSession: Promise<void> | null = null;

  const bootstrap = async () => {
    const response = await deps.fetch(BOOTSTRAP, {
      method: "POST",
      headers: { "content-type": BOOTSTRAP_FORM },
      body: `_expiry=${deps.now()}`,
    });
    await response.text();
    if (response.status !== 200) return;
    session = response.headers.get(UPSTREAM_SET_COOKIE);
    sessionOpened = true;
  };

  const held = async (): Promise<string | null> => {
    if (sessionOpened) return session;
    if (openingSession === null)
      openingSession = bootstrap().finally(() => {
        openingSession = null;
      });
    await openingSession;
    return session;
  };

  const send = async (path: string): Promise<Answer | null> => {
    try {
      const carried = await held();
      if (!sessionOpened) return null;
      const response = await deps.fetch(
        path,
        carried === null
          ? undefined
          : { headers: { [UPSTREAM_COOKIE]: carried } },
      );
      const reopened = response.headers.get(UPSTREAM_SET_COOKIE);
      if (reopened !== null) session = reopened;
      return { status: response.status, body: await response.text() };
    } catch {
      return null;
    }
  };

  const dropRejectedSession = (answer: Answer | null, refreshable: boolean) => {
    if (refreshable && rejected(answer)) {
      sessionOpened = false;
      return true;
    }
    return false;
  };

  const unreachable = (attempts: number): Reading => ({
    ok: false,
    reason: "unreachable",
    fetchedAt: deps.now(),
    attempts,
  });

  const settled = (
    answer: Answer | null,
    attempts: number,
    refusals: Refusals,
  ): Reading | null => {
    if (answer === null) return null;
    if (answer.status === 200)
      return {
        ok: true,
        payload: answer.body,
        fetchedAt: deps.now(),
        attempts,
      };
    const reason = refusals[answer.status];
    return reason === undefined
      ? null
      : { ok: false, reason, fetchedAt: deps.now(), attempts };
  };

  const read = async (path: string, refusals: Refusals = {}) => {
    let refreshable = true;
    for (let attempt = 1; attempt <= policy.attempts; attempt += 1) {
      if (breaker.refuses()) return unreachable(attempt - 1);
      const answer = await send(path);
      const reading = settled(answer, attempt, refusals);
      if (reading !== null) {
        breaker.succeeded();
        return reading;
      }
      if (dropRejectedSession(answer, refreshable)) refreshable = false;
      else if (attempt < policy.attempts)
        await deps.wait(delayAfter(attempt, policy.firstDelayMs, deps.random));
    }
    breaker.failed();
    return unreachable(policy.attempts);
  };

  return {
    theatersNear: (area) =>
      read(
        `/napi/nearbyTheaters?zipCode=${encodeURIComponent(area)}&limit=${THEATERS_ASKED_FOR}`,
      ),
    showtimesFor: (movie, date, area) =>
      read(
        `/napi/theaterShowtimeGroupings/${encodeURIComponent(movie)}/${encodeURIComponent(date)}?isdesktop=true&isDesktopMOP=true&zip=${encodeURIComponent(area)}&partnerRestrictedTicketing=`,
      ),
    seatsFor: (showtime) =>
      read(`/napi/seatMap/${encodeURIComponent(showtime)}`, SEAT_MAP_REFUSALS),
  };
};
