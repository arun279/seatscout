import { REFERENCE, type SeatProfile } from "@seatscout/core";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { FIELDS, isReference, openProfile } from "./profile.js";
import { inMemoryStore } from "./store.js";

const KEY = "seatscout.profile.v1";

const CLOSER: SeatProfile = {
  targetDepth: 0.4,
  targetLateral: 0.1,
  depthWeight: 1.5,
  offAxisWeight: 0.5,
  frontBandWeight: 0,
  wallBandWeight: 0.5,
  podDividerWeight: 1,
  screenGap: 8,
  rowPitch: 2,
  frontBand: 5,
};

const unit = (min: number, max: number) =>
  fc.double({ min, max, noNaN: true }).filter((value) => !Object.is(value, -0));

const profiles: fc.Arbitrary<SeatProfile> = fc.record({
  targetDepth: unit(0, 1),
  targetLateral: unit(-1, 1),
  depthWeight: unit(0, 2),
  offAxisWeight: unit(0, 2),
  frontBandWeight: unit(0, 2),
  wallBandWeight: unit(0, 2),
  podDividerWeight: unit(0, 2),
  screenGap: unit(1, 48),
  rowPitch: unit(0, 3),
  frontBand: unit(0, 20),
});

describe("the Seat Profile a device remembers", () => {
  it("is Reference on a device that remembers none", async () => {
    expect(await openProfile(inMemoryStore()).remembered()).toEqual(REFERENCE);
  });

  it("is whatever Profile was last remembered, exactly, for any Profile", async () => {
    await fc.assert(
      fc.asyncProperty(profiles, profiles, async (earlier, later) => {
        const store = inMemoryStore();
        await openProfile(store).remember(earlier);
        await openProfile(store).remember(later);

        expect(await openProfile(store).remembered()).toEqual(later);
      }),
      { numRuns: 100 },
    );
  });

  it("keeps the Profile under a key that names the shape it stores", async () => {
    const store = inMemoryStore();
    await openProfile(store).remember(CLOSER);

    expect(await store.read(KEY)).toEqual(CLOSER);
  });

  it("is Reference when what the device holds was not written by this build", async () => {
    const held: [string, unknown][] = [
      ["a string", "closer"],
      ["a number", 0.4],
      ["nothing", null],
      [
        "a Profile with a weight spelled out",
        { ...CLOSER, depthWeight: "1.5" },
      ],
      ...FIELDS.map((field): [string, unknown] => {
        const { [field]: _, ...short } = CLOSER;
        return [`a Profile without ${field}`, short];
      }),
    ];
    const read: [string, SeatProfile][] = [];
    for (const [what, value] of held) {
      const raw = {
        read: () => Promise.resolve(value),
        write: () => Promise.resolve(),
      };
      read.push([what, await openProfile(raw).remembered()]);
    }

    expect(read).toEqual(held.map(([what]) => [what, REFERENCE]));
  });

  it("names every field a Profile carries, so a Profile that grows a field has to move the shape", () => {
    expect([...FIELDS].toSorted()).toEqual(Object.keys(REFERENCE).toSorted());
  });

  it("tells Reference from a Profile that differs from it in any one field", () => {
    expect(isReference(REFERENCE)).toBe(true);
    expect(isReference({ ...REFERENCE })).toBe(true);
    expect(
      FIELDS.map((field) => [
        field,
        isReference({ ...REFERENCE, [field]: REFERENCE[field] + 0.01 }),
      ]),
    ).toEqual(FIELDS.map((field) => [field, false]));
  });
});
