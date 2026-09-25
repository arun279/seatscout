import { describe, expect, it } from "vitest";
import { scoped } from "./scope.ts";

const judged = { mutants: [{ status: "Killed" }] };

describe("scoping a report to the shard that restores it", () => {
  it("keeps the files the shard mutates and drops every other workspace's", () => {
    const report = JSON.stringify({
      schemaVersion: "2",
      files: {
        "tools/footprint/src/measure.ts": judged,
        "apps/web/src/index.tsx": judged,
        "packages/core/src/index.ts": judged,
      },
    });

    expect(
      JSON.parse(
        scoped(report, [
          "tools/*/src/**/*.{ts,tsx}",
          "apps/web/src/**/*.{ts,tsx}",
        ]),
      ),
    ).toStrictEqual({
      schemaVersion: "2",
      files: {
        "tools/footprint/src/measure.ts": judged,
        "apps/web/src/index.tsx": judged,
      },
    });
  });

  it("reads a report that holds no file as one that holds nothing", () => {
    expect(JSON.parse(scoped("{}", ["tools/*/src/**/*.ts"]))).toStrictEqual({
      files: {},
    });
  });
});
