import { describe, expect, it } from "vitest";
import { main } from "./main.ts";

const FILES: Readonly<Record<string, string>> = {
  "head.json": '[{"firstSeatGroupsMs":500},{"firstSeatGroupsMs":600}]',
  "base.json": '[{"firstSeatGroupsMs":300},{"firstSeatGroupsMs":400}]',
  "quick.json": '[{"firstSeatGroupsMs":200}]',
  "empty.json": "[]",
  "broken.json": '[{"lcp":1}]',
};

const ran = (...argv: string[]) => {
  const out: string[] = [];
  const err: string[] = [];
  const code = main(
    ["node", "journey", ...argv],
    (path) => FILES[path] ?? null,
    { write: (text) => out.push(text) },
    { write: (text) => err.push(text) },
  );
  return { code, out: out.join(""), err: err.join("") };
};

describe("the journey ratchet's command line", () => {
  it("holds the head to the base and exits non-zero on a regression", () => {
    const run = ran("--head", "head.json", "--base", "base.json");

    expect(run.code).toBe(1);
    expect(run.err).toContain("550 ms");
    expect(run.err).toContain("400 ms");
  });

  it("exits zero when the head is no slower, and says what it measured", () => {
    const run = ran("--head", "quick.json", "--base", "base.json");

    expect(run.code).toBe(0);
    expect(run.out).toContain("200 ms");
    expect(run.err).toBe("");
  });

  it("reports the absolute alone when told there is no baseline", () => {
    const run = ran("--head", "quick.json", "--no-baseline");

    expect(run.code).toBe(0);
    expect(run.out).toContain("no journey at the merge base");
    expect(run.out).toContain("200 ms");
    expect(run.err).toBe("");
  });

  it("skips the runtime and the script, whatever they are called", () => {
    const run = main(
      ["--head", "broken.json", "--head", "quick.json", "--no-baseline"],
      (path) => FILES[path] ?? null,
      { write: () => {} },
      { write: () => {} },
    );

    expect(run).toBe(0);
  });

  it("refuses a head file that is missing, empty, or not journeys, naming which", () => {
    const missing = ran("--head", "missing.json", "--no-baseline");
    const broken = ran("--head", "broken.json", "--no-baseline");

    expect(missing.code).toBe(1);
    expect(missing.err).toBe("missing.json was never written\n");
    expect(ran("--head", "empty.json", "--no-baseline").code).toBe(1);
    expect(broken.code).toBe(1);
    expect(broken.err).toBe(
      "broken.json holds no list of journeys carrying firstSeatGroupsMs\n",
    );
  });

  it("refuses a base file that is missing or not journeys", () => {
    expect(ran("--head", "quick.json", "--base", "missing.json").code).toBe(1);
    expect(ran("--head", "quick.json", "--base", "broken.json").code).toBe(1);
  });

  it("refuses to run without a head, or without saying whether there is a baseline", () => {
    expect(ran("--base", "base.json").code).toBe(2);
    expect(ran("--head", "quick.json").code).toBe(2);
    expect(
      ran("--head", "quick.json", "--base", "base.json", "--no-baseline").code,
    ).toBe(2);
    expect(ran("--head", "quick.json").err).toContain("--no-baseline");
  });
});
