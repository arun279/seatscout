import type { Fetch } from "../transport.js";
import { type RetryPolicy, delayAfter } from "./backoff.js";
import { type BreakerPolicy, circuitBreaker } from "./breaker.js";
import type { Reading, Source, Unreadable } from "./port.js";

const BOOTSTRAP = "/napi/preferences/themes";
const BOOTSTRAP_FORM = "application/x-www-form-urlencoded; charset=UTF-8";
const SESSION = "x-upstream-cookie";
const OPENED_SESSION = "x-upstream-set-cookie";

const REFUSALS: Readonly<Record<number, Unreadable>> = {
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
  readonly carried: string | null;
}

const rejected = (answer: Answer | null): answer is Answer =>
  answer !== null && answer.status === 403;

export const openSource = (deps: SourceDependencies): Source => {
  const policy = deps.policy ?? defaultPolicy;
  const breaker = circuitBreaker(policy, deps.now);
  let session: string | null = null;
  let opening: Promise<void> | null = null;

  const bootstrap = async () => {
    const response = await deps.fetch(BOOTSTRAP, {
      method: "POST",
      headers: { "content-type": BOOTSTRAP_FORM },
      body: `_expiry=${deps.now()}`,
    });
    await response.text();
    session = response.headers.get(OPENED_SESSION);
  };

  const held = async (): Promise<string | null> => {
    if (session !== null) return session;
    if (opening === null)
      opening = bootstrap().finally(() => {
        opening = null;
      });
    await opening;
    return session;
  };

  const send = async (path: string): Promise<Answer | null> => {
    try {
      const carried = await held();
      const response = await deps.fetch(
        path,
        carried === null ? undefined : { headers: { [SESSION]: carried } },
      );
      return { status: response.status, body: await response.text(), carried };
    } catch {
      return null;
    }
  };

  const dropIfCurrent = (carried: string | null) => {
    if (session === carried) session = null;
  };

  const unreachable = (attempts: number): Reading => ({
    ok: false,
    reason: "unreachable",
    fetchedAt: deps.now(),
    attempts,
  });

  const settled = (answer: Answer | null, attempts: number): Reading | null => {
    if (answer === null) return null;
    if (answer.status === 200)
      return {
        ok: true,
        payload: answer.body,
        fetchedAt: deps.now(),
        attempts,
      };
    const reason = REFUSALS[answer.status];
    return reason === undefined
      ? null
      : { ok: false, reason, fetchedAt: deps.now(), attempts };
  };

  const recover = async (
    answer: Answer | null,
    attempt: number,
    refreshable: boolean,
  ): Promise<boolean> => {
    if (refreshable && rejected(answer)) {
      dropIfCurrent(answer.carried);
      return false;
    }
    if (attempt < policy.attempts)
      await deps.wait(delayAfter(attempt, policy, deps.random));
    return refreshable;
  };

  const read = async (path: string): Promise<Reading> => {
    if (breaker.isOpen()) return unreachable(0);

    let refreshable = true;
    for (let attempt = 1; attempt <= policy.attempts; attempt += 1) {
      const answer = await send(path);
      const reading = settled(answer, attempt);
      if (reading !== null) {
        breaker.succeeded();
        return reading;
      }
      refreshable = await recover(answer, attempt, refreshable);
    }
    breaker.failed();
    return unreachable(policy.attempts);
  };

  return {
    theatersNear: (area) =>
      read(`/napi/nearbyTheaters?zipCode=${area}&limit=25`),
    showtimesFor: (movie, date, area) =>
      read(
        `/napi/theaterShowtimeGroupings/${movie}/${date}?isdesktop=true&isDesktopMOP=true&zip=${area}&partnerRestrictedTicketing=`,
      ),
    seatsFor: (showtime) => read(`/napi/seatMap/${showtime}`),
  };
};
