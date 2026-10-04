import type { SourcePolicy } from "./aggregator.js";

export const POLICY: SourcePolicy = {
  retry: { attempts: 3, firstDelayMs: 500 },
  breaker: { failuresBeforeOpening: 3, openForMs: 5000 },
};
