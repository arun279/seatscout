import type { Search, Snapshot } from "@seatscout/client";
import { describe, expect, it } from "vitest";
import { heldSnapshots } from "./held.js";

const EMPTY: Snapshot = {
  results: [],
  coverage: {
    candidates: 0,
    checked: 0,
    soldOut: [],
    noSeatMap: [],
    started: [],
    salesOff: [],
    unidentified: [],
    failed: [],
  },
  phase: "resolving",
};

const searching = () => {
  const listeners = new Set<() => void>();
  let current = EMPTY;
  const search: Search = {
    snapshot: () => current,
    subscribe: (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    done: Promise.resolve(EMPTY),
    abort: () => {},
    auditorium: () => {
      throw new Error("no room was read");
    },
  };
  return {
    search,
    publish: (phase: Snapshot["phase"]) => {
      current = { ...EMPTY, phase };
      for (const listener of listeners) listener();
    },
  };
};

describe("holding a snapshot still under a pointer", () => {
  it("passes each change through while nothing is held", () => {
    const { search, publish } = searching();
    const held = heldSnapshots(search);
    const heard: string[] = [];
    held.subscribe(() => heard.push(held.snapshot().phase));

    publish("searching");
    publish("settled");

    expect(heard).toEqual(["searching", "settled"]);
    expect(held.snapshot()).toBe(search.snapshot());
  });

  it("keeps the snapshot it had while a pointer is down, and lets the latest through on release", () => {
    const { search, publish } = searching();
    const held = heldSnapshots(search);
    const heard: string[] = [];
    held.subscribe(() => heard.push(held.snapshot().phase));
    const before = held.snapshot();

    held.hold();
    publish("searching");
    publish("settled");

    expect(heard).toEqual([]);
    expect(held.snapshot()).toBe(before);

    held.release();

    expect(heard).toEqual(["settled"]);
    expect(held.snapshot()).toBe(search.snapshot());
  });

  it("lets every change after a release through as it comes", () => {
    const { search, publish } = searching();
    const held = heldSnapshots(search);
    const heard: string[] = [];
    held.subscribe(() => heard.push(held.snapshot().phase));

    held.hold();
    publish("searching");
    held.release();
    publish("settled");

    expect(heard).toEqual(["searching", "settled"]);
  });

  it("says nothing on a second release once the change it held back has gone through", () => {
    const { search, publish } = searching();
    const held = heldSnapshots(search);
    const heard: string[] = [];
    held.subscribe(() => heard.push(held.snapshot().phase));

    held.hold();
    publish("searching");
    held.release();
    held.hold();
    held.release();

    expect(heard).toEqual(["searching"]);
  });

  it("says nothing on a release that held back no change", () => {
    const { search } = searching();
    const held = heldSnapshots(search);
    const heard: string[] = [];
    held.subscribe(() => heard.push(held.snapshot().phase));

    held.hold();
    held.release();

    expect(heard).toEqual([]);
  });

  it("stops telling a subscriber that has unsubscribed", () => {
    const { search, publish } = searching();
    const held = heldSnapshots(search);
    const heard: string[] = [];
    const stop = held.subscribe(() => heard.push(held.snapshot().phase));

    stop();
    publish("settled");

    expect(heard).toEqual([]);
    expect(held.snapshot().phase).toBe("settled");
  });
});
