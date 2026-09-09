import { fireEvent, screen, within } from "@testing-library/react";
import type { HeldProgramme, ProgrammeState } from "./programme.js";
import { ask, NO_MOVIE, staged, TODAY } from "./search.fixtures.js";
import { type Terms, termsFrom } from "./terms.js";

const NOTHING_READ: ProgrammeState = {
  phase: "none",
  theaters: [],
  movies: [],
};

export const NOTHING_PLAYING: HeldProgramme = {
  area: undefined,
  date: TODAY,
  snapshot: () => NOTHING_READ,
  subscribe: () => () => {},
};

export const NOTHING: Terms = { date: TODAY, partySize: 2 };

export const EVERYTHING = termsFrom(
  "?movie=245569&date=2026-08-28&area=75006&partySize=2&chain=AMC&chain=Landmark&theater=aacbt&theater=aaxju&format=Dolby+Cinema&format=IMAX&amenity=Recliners&from=19:00&until=21:00&accessibleSeating=true",
  TODAY,
);

type Staged = Parameters<typeof staged>[0];

export const opened = async (options: Staged = {}) => {
  const stage = staged(options);
  await stage.programmed();
  fireEvent.click(screen.getByRole("button", { name: /two seats together/i }));
  return stage;
};

export const asking = async (options: Staged = {}) => {
  const stage = staged({ terms: NO_MOVIE, ...options });
  await stage.programmed();
  fireEvent.click(screen.getByRole("button", { name: "Find seats" }));
  return stage;
};

export const film = () => ask().getByLabelText("Film");

export const typed = (text: string) =>
  fireEvent.change(film(), { target: { value: text } });

export const suggested = () =>
  ask()
    .queryAllByRole("list", { name: /playing near/i })
    .flatMap((list) =>
      within(list)
        .getAllByRole("button")
        .map((button) => button.textContent),
    );

export const chip = (name: string) => ask().getByRole("button", { name });

export const chipsIn = (group: string) =>
  within(ask().getByRole("group", { name: group })).getAllByRole("button");

export const find = () =>
  fireEvent.click(ask().getByRole("button", { name: /find seats/i }));
