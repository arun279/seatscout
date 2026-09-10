import { fireEvent, screen, within } from "@testing-library/react";
import type { HeldProgramme } from "./programme.js";
import type { Stage } from "./search.fixtures.js";
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

export const opened = async (options: Staged = {}): Promise<Stage> => {
  const stage = staged(options);
  await stage.programmed();
  fireEvent.click(screen.getByRole("button", { name: /two seats together/i }));
  return stage;
};

export const asking = async (options: Staged = {}): Promise<Stage> => {
  const stage = staged({ terms: NO_MOVIE, ...options });
  await stage.programmed();
  fireEvent.click(screen.getByRole("button", { name: "Find seats" }));
  return stage;
};

export const film = (): HTMLElement => ask().getByLabelText("Film");

export const typed = (text: string): boolean =>
  fireEvent.change(film(), { target: { value: text } });

export const suggested = (): string[] =>
  ask()
    .queryAllByRole("list", { name: /playing near/i })
    .flatMap((list) =>
      within(list)
        .getAllByRole("button")
        .map((button) => button.textContent),
    );

export const chip = (name: string): HTMLElement =>
  ask().getByRole("button", { name });

export const chipsIn = (group: string): HTMLElement[] =>
  within(ask().getByRole("group", { name: group })).getAllByRole("button");

export const find = (): boolean =>
  fireEvent.click(ask().getByRole("button", { name: /find seats/i }));
