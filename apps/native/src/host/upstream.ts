import type { createSeatScout } from "@seatscout/client";

export type Fetch = Parameters<typeof createSeatScout>[0]["fetch"];

export const upstream: Fetch = (url, init) => fetch(url, init);
