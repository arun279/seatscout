import { jest } from "@jest/globals";
import { REFERENCE, type SeatProfile } from "@seatscout/client";
import type { Term, Terms } from "@seatscout/view-logic";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Ask } from "../src/ask/ask.js";
import { nearby, type Phone, type Playing, phone } from "./phone.js";

export const TODAY = "2026-09-19";

const SHORT: Terms = { date: TODAY, partySize: 2 };

export const NEAR: Terms = { ...SHORT, area: "75234" };

export const PLAYING: Playing = {
  area: "75234",
  date: TODAY,
  programme: {
    theaters: nearby("aacbt", "Cinemark Dallas XD and IMAX"),
    movies: [
      { id: "23184", title: "Akira" },
      { id: "246329", title: "Coyote vs. Acme" },
    ],
    unreached: [],
  },
};

type Found = (terms: Terms, profile: SeatProfile) => void;

export interface Asked extends Phone {
  readonly found: ReturnType<typeof jest.fn<Found>>;
}

export const asking = async (
  over: {
    readonly terms?: Terms;
    readonly focus?: Term;
    readonly onKeep?: () => void;
    readonly playing?: Playing;
    readonly profile?: SeatProfile;
  } = {},
): Promise<Asked> => {
  const carried = phone([], { playing: over.playing });
  const found = jest.fn<Found>();
  await render(
    <Ask
      focus={over.focus}
      onFind={found}
      onKeep={over.onKeep ?? (() => undefined)}
      profile={over.profile ?? REFERENCE}
      seatscout={carried.seatscout}
      terms={over.terms ?? SHORT}
      today={TODAY}
    />,
  );
  return { ...carried, found };
};

export const submit = async (): Promise<void> => {
  await fireEvent.press(screen.getByRole("button", { name: "Find seats" }));
};
