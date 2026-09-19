import { describe, expect, it, jest } from "@jest/globals";
import type { Term, Terms } from "@seatscout/view-logic";
import { fireEvent, render, screen } from "@testing-library/react-native";
import {
  everyControlReachesTheTouchFloor,
  everyControlSaysWhatItIs,
} from "../../test/floors.js";
import { nearby, phone } from "../../test/phone.js";

import { Ask } from "./ask.js";

const TODAY = "2026-09-19";

const SHORT: Terms = { date: TODAY, partySize: 2 };

const NEAR: Terms = { ...SHORT, area: "75234" };

const PLAYING = {
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

const asking = async (
  over: {
    readonly terms?: Terms;
    readonly focus?: Term;
    readonly onFind?: (terms: Terms) => void;
    readonly onKeep?: () => void;
    readonly playing?: typeof PLAYING;
  } = {},
) => {
  const carried = phone([], over.playing);
  const found = jest.fn<(terms: Terms) => void>();
  await render(
    <Ask
      focus={over.focus}
      onFind={over.onFind ?? found}
      onKeep={over.onKeep ?? (() => undefined)}
      seatscout={carried.seatscout}
      terms={over.terms ?? SHORT}
      today={TODAY}
    />,
  );
  return { ...carried, found };
};

const submit = async () => {
  await fireEvent.press(screen.getByRole("button", { name: "Find seats" }));
};

describe("the Ask sheet", () => {
  it("asks what a person is seeing, under the terms it already holds", async () => {
    await asking({ terms: NEAR });

    expect(screen.getByText("What are we seeing?")).toBeOnTheScreen();
    expect(screen.getByLabelText("Near, by postal code")).toHaveDisplayValue(
      "75234",
    );
    expect(
      screen.getByRole("button", { name: "When, Today" }),
    ).toBeOnTheScreen();
    expect(screen.getByText("2")).toBeOnTheScreen();
  });

  it("names the film the query already carries by its title", async () => {
    await asking({ terms: { ...NEAR, movie: "23184" }, playing: PLAYING });

    expect(await screen.findByLabelText("Film")).toHaveDisplayValue("Akira");
  });

  it("keeps everything as it was when the way back is pressed", async () => {
    const kept = jest.fn();
    await asking({ onKeep: kept, terms: NEAR });

    await fireEvent.press(
      screen.getByRole("button", { name: "Keep as it was" }),
    );

    expect(kept).toHaveBeenCalledTimes(1);
  });

  it("reads what is playing near the area the query already names", async () => {
    await asking({ terms: NEAR, playing: PLAYING });

    expect(
      await screen.findByRole("button", { name: "Coyote vs. Acme" }),
    ).toBeOnTheScreen();
  });

  it("hands out the area that was typed as the Query's own", async () => {
    const { found } = await asking();

    await fireEvent.changeText(
      screen.getByLabelText("Near, by postal code"),
      "75006",
    );
    await submit();

    expect(found).toHaveBeenCalledWith({
      area: "75006",
      date: TODAY,
      partySize: 2,
    });
  });

  it("hands out the film a person picked from the listing, by the identity a listing is asked by", async () => {
    const { found } = await asking({ terms: NEAR, playing: PLAYING });

    await fireEvent.press(await screen.findByRole("button", { name: "Akira" }));
    await submit();

    expect(found).toHaveBeenCalledWith({
      movie: "23184",
      area: "75234",
      date: TODAY,
      partySize: 2,
    });
  });

  it("hands out the party a person stepped to", async () => {
    const { found } = await asking({ terms: NEAR });

    await fireEvent.press(screen.getByRole("button", { name: "More seats" }));
    await submit();

    expect(found).toHaveBeenCalledWith({ ...NEAR, partySize: 3 });
  });

  it("hands out the date a person picked", async () => {
    const { found } = await asking({ terms: NEAR });

    await fireEvent.press(screen.getByRole("button", { name: "When, Today" }));
    await fireEvent(
      screen.getByTestId("date-picker"),
      "change",
      {
        type: "set",
        nativeEvent: {},
      },
      new Date(2026, 8, 26),
    );
    await submit();

    expect(found).toHaveBeenCalledWith({ ...NEAR, date: "2026-09-26" });
  });

  it("reads the listing again for the area a person typed once they have finished typing it", async () => {
    await asking({ playing: PLAYING });
    const area = screen.getByLabelText("Near, by postal code");

    await fireEvent.changeText(area, "75234");
    await fireEvent(area, "blur");

    expect(
      await screen.findByRole("button", { name: "Akira" }),
    ).toBeOnTheScreen();
  });

  it("opens with the keyboard on the term it was asked to open at, and on no other", async () => {
    await asking({ focus: "movie", terms: NEAR });

    expect(screen.getByLabelText("Film")).toHaveProp("autoFocus", true);
    expect(screen.getByLabelText("Near, by postal code")).toHaveProp(
      "autoFocus",
      false,
    );
  });

  it("says what stays on the phone beside the one control that commits", async () => {
    await asking();

    expect(screen.getAllByTestId("velvet")).toHaveLength(1);
    expect(
      screen.getByText(
        "Preferences and history stay on this phone. No account exists.",
      ),
    ).toBeOnTheScreen();
  });
});

describe("what a thumb can reach in the Ask sheet", () => {
  it("draws every control at the platform's touch floor or above", async () => {
    await asking({ terms: NEAR, playing: PLAYING });

    everyControlReachesTheTouchFloor();
  });

  it("gives every control a name a screen reader can say", async () => {
    await asking({ terms: NEAR, playing: PLAYING });

    everyControlSaysWhatItIs();
  });
});
