export interface RetryPolicy {
  readonly attempts: number;
  readonly firstDelayMs: number;
}

export const delayAfter = (
  failedAttempts: number,
  firstDelayMs: number,
  random: () => number,
): number => random() * firstDelayMs * 2 ** (failedAttempts - 1);
