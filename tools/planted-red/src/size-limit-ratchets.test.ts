import { describe, expect, it } from "vitest";
import { ran } from "./planted.fixtures.ts";

const PLANTED = "tools/planted-red/planted/size-limit";

const sizeLimitOver = (config: string) => {
  const run = ran("size-limit", "--config", `${PLANTED}/${config}`, "--json");
  return { status: run.status, weighed: JSON.parse(run.stdout) };
};

describe("the planted red under the font and icon ratchets", () => {
  it("refuses a planted file that goes over the ratchet its kind is held to", () => {
    const { status, weighed } = sizeLimitOver("over-the-ratchet.json");

    expect(status).toBe(1);
    expect(weighed).toStrictEqual([
      { name: "icons", passed: false, size: 118, sizeLimit: 1 },
    ]);
  });

  it("weighs nothing and holds it to no ratchet when a glob matches no file", () => {
    const { weighed } = sizeLimitOver("weighs-nothing.json");

    expect(weighed).toStrictEqual([
      { name: "fonts", passed: true, size: 0 },
      { name: "icons", passed: true, size: 0 },
    ]);
  });
});
