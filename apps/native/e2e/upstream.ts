import { fakeUpstream } from "@seatscout/client/testing";
import type { Fetch } from "../src/host/upstream.js";

export const upstream: Fetch = fakeUpstream({
  seed: 4,
  standInAuditoriums: true,
  standInTheaters: true,
});
