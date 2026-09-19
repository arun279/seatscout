import { describe, expect, it } from "vitest";
import wrangler from "../wrangler.json";

describe("the deployed configuration", () => {
  it("declares nothing but itself, the directory it publishes and the two settings it reads, so there is nowhere for user data to go", () => {
    expect(Object.keys(wrangler).sort()).toEqual([
      "$schema",
      "assets",
      "compatibility_date",
      "main",
      "name",
      "ratelimits",
      "vars",
    ]);
  });

  it("publishes that directory without taking a binding to it, so the worker cannot reach it either", () => {
    expect(Object.keys(wrangler.assets)).toEqual(["directory"]);
  });

  it("names the upstream in the file, so a deploy needs nothing set by hand", () => {
    expect(wrangler.vars).toEqual({
      UPSTREAM_ORIGIN: "https://www.fandango.com",
    });
  });

  it("admits three of the widest search a minute from one visitor", () => {
    expect(wrangler.ratelimits).toEqual([
      {
        name: "VISITOR_RATE",
        namespace_id: "1",
        simple: { limit: 540, period: 60 },
      },
    ]);
  });
});
