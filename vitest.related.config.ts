import { mergeConfig } from "vitest/config";
import base from "./vitest.config.ts";

export default mergeConfig(base, {
  test: {
    related: (process.env["RELATED_FILES"] ?? "").split("\n").filter(Boolean),
  },
});
