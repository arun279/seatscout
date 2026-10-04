import type { SourcePolicy } from "@seatscout/core";

export interface SourceLimits extends SourcePolicy {
  readonly seatMapsPerStep: number;
  readonly width: number;
  readonly refusalCooldownMs: number;
}

export const SOURCE_LIMITS: SourceLimits = {
  seatMapsPerStep: 48,
  width: 24,
  retry: {
    attempts: 3,
    firstDelayMs: 500,
  },
  breaker: {
    failuresBeforeOpening: 3,
    openForMs: 5000,
  },
  refusalCooldownMs: 420_000,
};
