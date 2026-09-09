import { fireEvent, screen, within } from "@testing-library/react";
import type { HeldProgramme } from "./programme.js";
import {
  ask,
  NO_MOVIE,
  NOTHING_READ,
  staged,
  TODAY,
} from "./search.fixtures.js";

export const NOTHING_PLAYING: HeldProgramme = {
  area: undefined,
  date: TODAY,
  snapshot: () => NOTHING_READ,
  subscribe: () => () => {},
};

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
