import {
  createSeatScout,
  type SearchTerms,
  type SeatGroupResult,
  type Snapshot,
} from "@seatscout/client";
import { fakeUpstream, type UpstreamScript } from "@seatscout/client/testing";
import type { ProgrammeState, Terms } from "@seatscout/view-logic";

export const TODAY = "2026-08-28";

export const NOW = 1_789_000_000_000;

export const NOTHING_READ: ProgrammeState = {
  phase: "none",
  movies: [],
  theaters: [],
};

export const TONIGHT: Terms = {
  movie: "246427",
  date: TODAY,
  area: "75006",
  partySize: 2,
  from: "19:00",
  until: "20:00",
};

export const ASKED: SearchTerms = {
  movie: "246427",
  dates: [TODAY],
  area: "75006",
  partySize: 2,
  from: "19:00",
  until: "20:00",
  accessibleSeating: false,
};

export const settled = (
  asked: SearchTerms = ASKED,
  script: Omit<UpstreamScript, "seed"> = {},
): Promise<Snapshot> =>
  createSeatScout({
    fetch: fakeUpstream({
      seed: 4,
      standInAuditoriums: true,
      standInTheaters: true,
      ...script,
    }),
    now: () => NOW,
    wait: () => Promise.resolve(),
    random: () => 0,
  }).search(asked).done;

export const formatted = (snapshot: Snapshot): SeatGroupResult => {
  const result = snapshot.results.find(
    (found) => found.showtime.presentation.formats.length > 0,
  );
  if (result === undefined) throw new Error("the corpus lost its Formats");
  return result;
};

export const WARM_UP = 30_000;

export const warmTheCorpus = async (): Promise<void> => {
  await settled();
};

export const first = (snapshot: Snapshot): SeatGroupResult => {
  const [result] = snapshot.results;
  if (result === undefined) throw new Error("the search found nothing");
  return result;
};
