import { describe, expect, it } from "vitest";
import { conditionsOf, readingsOf, type Sample, samplesIn } from "./samples.ts";

describe("reading the journeys a run wrote down", () => {
  it("reads every axis out of every journey", () => {
    expect(
      samplesIn(
        '[{"firstSeatGroupsMs":210,"lcp":50,"inp":8,"cls":0.01,"heapBytes":1024,"conditions":"a slow connection"},{"firstSeatGroupsMs":330,"lcp":60,"inp":9,"cls":0.02,"heapBytes":2048,"conditions":"a slow connection"}]',
      ),
    ).toEqual([
      {
        firstSeatGroupsMs: 210,
        lcp: 50,
        inp: 8,
        cls: 0.01,
        heapBytes: 1024,
        conditions: "a slow connection",
      },
      {
        firstSeatGroupsMs: 330,
        lcp: 60,
        inp: 9,
        cls: 0.02,
        heapBytes: 2048,
        conditions: "a slow connection",
      },
    ]);
  });

  it("reads an axis a journey never recorded as nothing, rather than refusing the file", () => {
    expect(samplesIn('[{"firstSeatGroupsMs":210}]')).toEqual([
      {
        firstSeatGroupsMs: 210,
        lcp: null,
        inp: null,
        cls: null,
        heapBytes: null,
        conditions: null,
      },
    ]);
  });

  it("reads an axis that is not a number as nothing", () => {
    expect(
      samplesIn('[{"firstSeatGroupsMs":210,"lcp":"soon","conditions":7}]'),
    ).toEqual([
      {
        firstSeatGroupsMs: 210,
        lcp: null,
        inp: null,
        cls: null,
        heapBytes: null,
        conditions: null,
      },
    ]);
  });

  it("reads an empty run as no journeys", () => {
    expect(samplesIn("[]")).toEqual([]);
  });

  it("refuses samples that are not a list of journeys carrying the moment", () => {
    expect(samplesIn('{"firstSeatGroupsMs":1}')).toBeNull();
    expect(samplesIn('[{"lcp":50}]')).toBeNull();
    expect(samplesIn('[{"firstSeatGroupsMs":"soon"}]')).toBeNull();
    expect(samplesIn("[null]")).toBeNull();
  });

  it("refuses the whole file when one journey among several is missing the moment", () => {
    expect(samplesIn('[{"firstSeatGroupsMs":210},{"lcp":50}]')).toBeNull();
  });

  it("lets a file that is not JSON at all throw, because that is a broken pipeline rather than a slow journey", () => {
    expect(() => samplesIn("not json")).toThrow(SyntaxError);
  });
});

describe("gathering one axis across the journeys", () => {
  const twoJourneys: readonly Sample[] = [
    {
      firstSeatGroupsMs: 1,
      lcp: 40,
      inp: 8,
      cls: 0.01,
      heapBytes: 1024,
      conditions: "a slow connection",
    },
    {
      firstSeatGroupsMs: 2,
      lcp: 60,
      inp: null,
      cls: 0.02,
      heapBytes: 2048,
      conditions: "a slow connection",
    },
  ];

  it("gathers the axis in the order the journeys were run", () => {
    expect(readingsOf(twoJourneys, (run) => run.lcp)).toEqual([40, 60]);
    expect(readingsOf(twoJourneys, (run) => run.heapBytes)).toEqual([
      1024, 2048,
    ]);
  });

  it("gathers nothing at all when one journey never measured that axis", () => {
    expect(readingsOf(twoJourneys, (run) => run.inp)).toBeNull();
  });

  it("gathers an empty list from no journeys", () => {
    expect(readingsOf([], (run) => run.lcp)).toEqual([]);
  });
});

describe("the conditions the journeys were run under", () => {
  const under = (
    ...conditions: readonly (string | null)[]
  ): readonly Sample[] =>
    conditions.map((value, at) => ({
      firstSeatGroupsMs: at,
      lcp: 40,
      inp: 8,
      cls: 0.01,
      heapBytes: 1024,
      conditions: value,
    }));

  it("names the conditions when every journey agrees", () => {
    expect(conditionsOf(under("a slow connection", "a slow connection"))).toBe(
      "a slow connection",
    );
  });

  it("names none when the journeys disagree, so nothing is held to a mixture", () => {
    expect(conditionsOf(under("a slow connection", "no throttle"))).toBeNull();
    expect(conditionsOf(under("a slow connection", null))).toBeNull();
  });

  it("names none for journeys that recorded no conditions, and for no journeys at all", () => {
    expect(conditionsOf(under(null, null))).toBeNull();
    expect(conditionsOf([])).toBeNull();
  });
});
