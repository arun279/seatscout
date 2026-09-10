import { mergeConfig } from "vitest/config";
import base from "./vitest.config.ts";

export default mergeConfig(base, {
  test: { testTimeout: 30_000, maxWorkers: 1 },
});
