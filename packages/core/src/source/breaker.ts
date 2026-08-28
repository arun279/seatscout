export interface BreakerPolicy {
  readonly failuresBeforeOpening: number;
  readonly openForMs: number;
}

interface Breaker {
  readonly isOpen: () => boolean;
  readonly succeeded: () => void;
  readonly failed: () => void;
}

export const circuitBreaker = (
  policy: BreakerPolicy,
  now: () => number,
): Breaker => {
  let failures = 0;
  let openUntil = 0;

  return {
    isOpen: () => now() < openUntil,
    succeeded: () => {
      failures = 0;
      openUntil = 0;
    },
    failed: () => {
      failures += 1;
      if (failures >= policy.failuresBeforeOpening)
        openUntil = now() + policy.openForMs;
    },
  };
};
