import { describe, expect, it } from "vitest";
import { ran } from "./planted.fixtures.ts";

const PLANTED = "tools/planted-red/planted/size-limit";

const sizeLimitOver = (config: string) => {
  const run = ran("size-limit", "--config", `${PLANTED}/${config}`, "--json");
  return { status: run.status, weighed: JSON.parse(run.stdout) };
};

describe("the planted red under the bundle gate", () => {
  it("weighs a glob from the directory its configuration sits in, which is how main's export is weighed by this change's globs", () => {
    const { status, weighed } = sizeLimitOver("weighs-a-file.json");

    expect(status).toBe(0);
    expect(weighed).toStrictEqual([{ name: "icons", size: 118 }]);
  });

  it("reports 0 B for a glob that matches no file, which the footprint report refuses rather than compares", () => {
    const { status, weighed } = sizeLimitOver("weighs-nothing.json");

    expect(status).toBe(1);
    expect(weighed).toStrictEqual([
      { name: "fonts", size: 0 },
      { name: "icons", size: 0 },
    ]);
  });
});
