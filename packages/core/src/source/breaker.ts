export interface BreakerPolicy {
  readonly failuresBeforeOpening: number;
  readonly openForMs: number;
}

export interface Breaker {
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
    isOpen: () => failures >= policy.failuresBeforeOpening && now() < openUntil,
    succeeded: () => {
      failures = 0;
    },
    failed: () => {
      failures += 1;
      if (failures >= policy.failuresBeforeOpening)
        openUntil = now() + policy.openForMs;
    },
  };
};
