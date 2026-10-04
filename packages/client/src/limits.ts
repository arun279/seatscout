import type { SourcePolicy } from "@seatscout/core";

export interface SourceLimits extends SourcePolicy {
  readonly seatMapsPerStep: number;
  readonly width: number;
  readonly refusalCooldownMs: number;
}

export const SOURCE_LIMITS: SourceLimits = {
  // ADR 20: 48 seat maps in one burst met no refusal, 200 met 46.
  seatMapsPerStep: 48,
  // ADR 16: the measured optimum of the recorded timing table.
  width: 24,
  retry: {
    // ADR 17: at the 7% error rate measured under fan-out, a third attempt leaves one in 2,800.
    attempts: 3,
    // ADR 17: one measured round trip; Full Jitter draws each wait up to it, doubling.
    firstDelayMs: 500,
  },
  breaker: {
    // ADR 17: three failed readings are nine consecutive upstream failures.
    failuresBeforeOpening: 3,
    // ADR 17: Polly's published default break, longer than a whole measured search.
    openForMs: 5000,
  },
  // ADR 20: a refusal held for at least 6 min 2 s; 6 min 30 s is that floor and a margin.
  refusalCooldownMs: 390_000,
};
