export interface RetryPolicy {
  readonly attempts: number;
  readonly firstDelayMs: number;
}

export const delayAfter = (
  failedAttempts: number,
  policy: RetryPolicy,
  random: () => number,
): number => random() * policy.firstDelayMs * 2 ** (failedAttempts - 1);
