import { readFileSync } from "node:fs";
import { mergeConfig } from "vitest/config";
import { configFor } from "./vitest.config.ts";

interface Shard {
  readonly id: string;
  readonly workspace: string;
}

const shards: readonly Shard[] = JSON.parse(
  readFileSync(new URL("stryker.shards.json", import.meta.url), "utf8"),
);
const shard = shards.find(({ id }) => id === process.env["MUTATION_SHARD"]);

export default mergeConfig(configFor(shard?.workspace), {
  test: { testTimeout: 30_000 },
});
