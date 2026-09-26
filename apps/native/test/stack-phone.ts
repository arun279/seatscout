import type { SeatScout } from "@seatscout/client";
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

export const source: {
  readonly seatscout: SeatScout;
  readonly seatProfile: HeldProfile;
} = {
  seatscout: carried.seatscout,
  seatProfile: heldProfile(carried.seatscout),
};
