import { REFERENCE, type SeatProfile } from "@seatscout/core";
import { isRecord, type KeyValueStore } from "./store.js";

const KEY = "seatscout.profile.v1";

export const FIELDS = [
  "targetDepth",
  "targetLateral",
  "depthWeight",
  "offAxisWeight",
  "frontBandWeight",
  "wallBandWeight",
  "podDividerWeight",
  "screenGap",
  "rowPitch",
  "frontBand",
] as const satisfies readonly (keyof SeatProfile)[];

const isProfile = (value: unknown): value is SeatProfile =>
  isRecord(value) && FIELDS.every((field) => typeof value[field] === "number");

export const isReference = (profile: SeatProfile): boolean =>
  FIELDS.every((field) => profile[field] === REFERENCE[field]);

export const openProfile = (store: KeyValueStore) => ({
  remembered: async (): Promise<SeatProfile> => {
    const held = await store.read(KEY);
    return isProfile(held) ? held : REFERENCE;
  },
  remember: (profile: SeatProfile) => store.write(KEY, profile),
});
