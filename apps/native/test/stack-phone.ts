import type { SeatScout } from "@seatscout/client";
import { type HeldLights, heldLights } from "../src/host/lights.js";
import { type HeldProfile, heldProfile } from "../src/host/profile.js";
import { nearby, phone } from "./phone.js";

const carried = phone([], {
  script: {},
  playing: {
    area: "75234",
    date: "2026-09-19",
    programme: {
      theaters: nearby("aacbt", "Cinemark Dallas XD and IMAX"),
      movies: [{ id: "23184", title: "Akira" }],
      unreached: [],
    },
  },
});

export const reads: readonly string[] = carried.reads;

const held = heldProfile(carried.seatscout);

const lights = heldLights(carried.store, false);

export const source: {
  readonly seatScout: () => SeatScout;
  readonly seatProfile: () => HeldProfile;
  readonly houseLights: () => HeldLights;
} = {
  seatScout: () => carried.seatscout,
  seatProfile: () => held,
  houseLights: () => lights,
};
