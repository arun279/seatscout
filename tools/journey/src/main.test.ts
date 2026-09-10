import { describe, expect, it } from "vitest";
import { main } from "./main.ts";

const FILES: Readonly<Record<string, string>> = {
  "head.json":
    '[{"firstSeatGroupsMs":500,"lcp":900,"inp":40,"cls":0.01,"heapBytes":4096,"blockingMs":30,"longTasks":1,"conditions":"a slow connection"},{"firstSeatGroupsMs":600,"lcp":950,"inp":48,"cls":0.02,"heapBytes":6144,"blockingMs":34,"longTasks":1,"conditions":"a slow connection"}]',
  "base.json":
    '[{"firstSeatGroupsMs":300,"blockingMs":60,"longTasks":2,"conditions":"a slow connection"},{"firstSeatGroupsMs":400,"blockingMs":70,"longTasks":2,"conditions":"a slow connection"}]',
  "older.json": '[{"firstSeatGroupsMs":300},{"firstSeatGroupsMs":400}]',
  "quick.json":
    '[{"firstSeatGroupsMs":200,"lcp":900,"inp":40,"cls":0.01,"heapBytes":8192,"blockingMs":30,"longTasks":1,"conditions":"a slow connection"}]',
  "slow.json":
    '[{"firstSeatGroupsMs":200,"lcp":4000,"inp":40,"cls":0.01,"heapBytes":8192,"blockingMs":30,"longTasks":1,"conditions":"a slow connection"}]',
  "blocking.json":
    '[{"firstSeatGroupsMs":200,"lcp":900,"inp":40,"cls":0.01,"heapBytes":8192,"blockingMs":300,"longTasks":4,"conditions":"a slow connection"}]',
  "empty.json": "[]",
  "broken.json": '[{"lcp":1}]',
  "gesture.json":
    '[{"droppedFrames":0,"conditions":"a slow connection"},{"droppedFrames":1,"conditions":"a slow connection"}]',
  "gesture-base.json": '[{"droppedFrames":1,"conditions":"a slow connection"}]',
  "dropping.json": '[{"droppedFrames":6,"conditions":"a slow connection"}]',
  "broken-gesture.json": '[{"lcp":1}]',
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

const gestured = (...argv: string[]) =>
  ran("--head-gesture", "gesture.json", ...argv);

describe("the journey ratchet's command line", () => {
  it("holds the head to the base and exits non-zero on a regression", () => {
    const run = gestured("--head", "head.json", "--base", "base.json");

    expect(run.code).toBe(1);
    expect(run.err).toContain("550 ms");
    expect(run.err).toContain("400 ms");
    expect(run.out).toBe("");
  });

  it("exits zero when the head is no slower, and says what it measured on every axis", () => {
    const run = gestured(
      "--head",
      "quick.json",
      "--base",
      "base.json",
      "--base-gesture",
      "gesture-base.json",
    );

    expect(run.code).toBe(0);
    expect(run.out).toBe(
      "p75 LCP 900 ms against 2500, INP 40 ms against 200, CLS 0.010 against 0.1, over 1 journeys\n" +
        "the head's first Seat Groups took 200 ms in the median of 1 journeys; the merge base's slowest of 2 journeys took 400 ms\n" +
        "the head's long tasks blocked the main thread for 30 ms in the median of 1 journeys; the merge base's worst of 2 journeys blocked for 70 ms\n" +
        "the head's gesture dropped 0.5 frame(s) in the median of 2 gestures; the merge base's worst of 1 gestures dropped 1 frame(s)\n" +
        "the head ran 1 long tasks at their worst, each over the 50 ms the W3C Long Tasks API defines one at, blocking for 30 ms in the median of 1 journeys against the 200 ms web.dev publishes as good on average mobile hardware; nothing here gates on that threshold, because this runner applies no CPU multiplier\n" +
        "the head's JS heap held 8 KiB in the median of 1 journeys; the merge base measured no JS heap\n",
    );
    expect(run.err).toBe("");
  });

  it("reports rather than holds when the merge base measured the journey another way", () => {
    const run = gestured("--head", "head.json", "--base", "older.json");

    expect(run.code).toBe(0);
    expect(run.out).toContain(
      "which is not the same measurement to hold it to",
    );
  });

  it("reports rather than holds when the merge base predates a reading", () => {
    const run = gestured("--head", "quick.json", "--base", "older.json");

    expect(run.code).toBe(0);
    expect(run.out).toContain(
      "the merge base wrote down no blocking to hold it to",
    );
    expect(run.out).toContain("there is no gesture at the merge base");
  });

  it("refuses a journey over a Core Web Vitals threshold even where nothing got slower", () => {
    const run = gestured("--head", "slow.json", "--base", "base.json");

    expect(run.code).toBe(1);
    expect(run.err).toContain(
      "LCP over the threshold Google publishes as good",
    );
    expect(run.err).toContain("the head's first Seat Groups took 200 ms");
  });

  it("refuses a head that blocked the main thread longer than the base's worst", () => {
    const run = gestured("--head", "blocking.json", "--base", "base.json");

    expect(run.code).toBe(1);
    expect(run.err).toContain("more blocking than every blocking");
  });

  it("refuses a head whose gestures dropped more frames than the base's worst", () => {
    const run = ran(
      "--head",
      "quick.json",
      "--head-gesture",
      "dropping.json",
      "--base",
      "base.json",
      "--base-gesture",
      "gesture-base.json",
    );

    expect(run.code).toBe(1);
    expect(run.err).toContain("more dropped frames than every gesture");
  });

  it("reports the absolute alone when told there is no baseline", () => {
    const run = gestured("--head", "quick.json", "--no-baseline");

    expect(run.code).toBe(0);
    expect(run.out).toContain("no journey at the merge base to hold it to");
    expect(run.out).toContain("no blocking at the merge base to hold it to");
    expect(run.out).toContain("no gesture at the merge base to hold it to");
    expect(run.out).toContain(
      "there is no journey at the merge base to compare it with",
    );
    expect(run.out).toContain("200 ms");
    expect(run.err).toBe("");
  });

  it("skips the runtime and the script, whatever they are called", () => {
    const run = main(
      [
        "--head",
        "broken.json",
        "--head",
        "quick.json",
        "--head-gesture",
        "gesture.json",
        "--no-baseline",
      ],
      (path) => FILES[path] ?? null,
      { write: () => {} },
      { write: () => {} },
    );

    expect(run).toBe(0);
  });

  it("refuses a head file that is missing, empty, or not journeys, naming which", () => {
    const missing = gestured("--head", "missing.json", "--no-baseline");
    const broken = gestured("--head", "broken.json", "--no-baseline");

    expect(missing.code).toBe(1);
    expect(missing.err).toBe("missing.json was never written\n");
    expect(gestured("--head", "empty.json", "--no-baseline").code).toBe(1);
    expect(broken.code).toBe(1);
    expect(broken.err).toBe(
      "broken.json holds no list of journeys carrying firstSeatGroupsMs\n",
    );
  });

  it("refuses a gesture file that is missing or not gestures, naming which", () => {
    const missing = ran(
      "--head",
      "quick.json",
      "--head-gesture",
      "missing.json",
      "--no-baseline",
    );
    const broken = ran(
      "--head",
      "quick.json",
      "--head-gesture",
      "broken-gesture.json",
      "--no-baseline",
    );

    expect(missing.code).toBe(1);
    expect(missing.err).toBe("missing.json was never written\n");
    expect(broken.code).toBe(1);
    expect(broken.err).toBe(
      "broken-gesture.json holds no list of gestures carrying droppedFrames\n",
    );
  });

  it("refuses a base file that is missing or not journeys", () => {
    expect(
      gestured("--head", "quick.json", "--base", "missing.json").code,
    ).toBe(1);
    expect(gestured("--head", "quick.json", "--base", "broken.json").code).toBe(
      1,
    );
    expect(
      ran(
        "--head",
        "quick.json",
        "--head-gesture",
        "gesture.json",
        "--base",
        "base.json",
        "--base-gesture",
        "broken-gesture.json",
      ).code,
    ).toBe(1);
  });

  it("refuses to run without a head, a head gesture, or a word about a baseline", () => {
    expect(gestured("--base", "base.json").code).toBe(2);
    expect(ran("--head", "quick.json", "--no-baseline").code).toBe(2);
    expect(gestured("--head", "quick.json").code).toBe(2);
    expect(
      gestured("--head", "quick.json", "--base", "base.json", "--no-baseline")
        .code,
    ).toBe(2);
    expect(
      gestured(
        "--head",
        "quick.json",
        "--base-gesture",
        "gesture-base.json",
        "--no-baseline",
      ).code,
    ).toBe(2);
    expect(gestured("--head", "quick.json").err).toContain("--no-baseline");
  });
});
