import { describe, expect, it, jest } from "@jest/globals";
import type { Movie } from "@seatscout/client";
import type { ProgrammeState } from "@seatscout/view-logic";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { contrastOf } from "../../test/contrast.js";
import { houseLights } from "../../test/lights.js";
import { nearby } from "../../test/phone.js";
import { type Appearance, themeFor } from "../theme.js";
import { Film } from "./film.js";

const TODAY = "2026-09-19";

const APPEARANCES: readonly Appearance[] = ["down", "up"];

const PLAYING: readonly Movie[] = [
  { id: "23184", title: "Akira" },
  { id: "245476", title: "Colony (2026)" },
  { id: "246329", title: "Coyote vs. Acme" },
];

const READ: ProgrammeState = {
  phase: "read",
  theaters: nearby("aacbt", "Cinemark Dallas XD and IMAX"),
  movies: PLAYING,
  unreached: [],
};

const showing = async (
  over: {
    readonly appearance?: Appearance;
    readonly area?: string | undefined;
    readonly programme?: ProgrammeState;
    readonly typed?: string;
    readonly onTyped?: (typed: string) => void;
  } = {},
) => {
  houseLights(over.appearance ?? "down");
  await render(
    <Film
      area={over.area ?? "75234"}
      date={TODAY}
      focused={false}
      onTyped={over.onTyped ?? (() => undefined)}
      programme={over.programme ?? READ}
      today={TODAY}
      typed={over.typed ?? ""}
    />,
  );
};

const toneOf = async (appearance: Appearance, programme: ProgrammeState) => {
  await showing({ appearance, programme });
  const { color } = StyleSheet.flatten(
    screen.getByRole("status").props["style"],
  );
  await cleanup();
  return String(color);
};

describe("naming the film in the Ask sheet", () => {
  it("lists what is playing as soon as the area is known, before a letter is typed", async () => {
    await showing();

    for (const movie of PLAYING)
      expect(
        screen.getByRole("button", { name: movie.title }),
      ).toBeOnTheScreen();
  });

  it("holds each film as an item of the list, which the web build draws as one", async () => {
    await showing();

    expect(
      PLAYING.map(
        (movie) =>
          screen.getByRole("button", { name: movie.title }).parent?.props[
            "role"
          ],
      ),
    ).toEqual(["listitem", "listitem", "listitem"]);
  });

  it("narrows the list to what has been typed", async () => {
    await showing({ typed: "co" });

    expect(
      screen.getByRole("button", { name: "Colony (2026)" }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Akira" })).toBeNull();
  });

  it("marks the typed letters in the pigment where they sit in a title", async () => {
    await showing({ typed: "acme" });
    const marked = StyleSheet.flatten(screen.getByText("Acme").props["style"]);
    const title = StyleSheet.flatten(
      screen.getByText("Coyote vs. Acme").props["style"],
    );

    expect(String(marked.color)).toMatch(/^#[0-9a-f]{6}$/);
    expect(marked.color).not.toBe(title.color);
  });

  it("takes the title a person presses as what they typed", async () => {
    const typed = jest.fn<(typed: string) => void>();
    await showing({ onTyped: typed });

    await fireEvent.press(screen.getByRole("button", { name: "Akira" }));

    expect(typed).toHaveBeenCalledWith("Akira");
  });

  it("offers nothing more once the title is whole", async () => {
    await showing({ typed: "Akira" });

    expect(screen.queryByRole("button", { name: "Akira" })).toBeNull();
  });

  it("says what the listing under the field is, as a line that is spoken politely", async () => {
    await showing();
    const status = screen.getByRole("status");

    expect(status).toHaveTextContent("3 films playing near 75234 today");
    expect(status).toHaveProp("accessibilityLiveRegion", "polite");
  });

  it("asks for an area while the query names none, and still takes a film", async () => {
    await showing({
      area: undefined,
      programme: { phase: "none", theaters: [], movies: [] },
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Name an area to see what is playing.",
    );
    expect(screen.getByLabelText("Film")).toBeOnTheScreen();
  });

  it("says it is reading, and offers no listing while it is", async () => {
    await showing({
      programme: { phase: "reading", theaters: [], movies: [] },
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Reading what is playing near 75234",
    );
    expect(screen.queryByLabelText("Films playing near 75234")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("keeps the field a person types in out of the list beneath it, so it cannot scroll away", async () => {
    await showing();
    const offered = screen.getByTestId("offered");

    expect(within(offered).queryByLabelText("Film")).toBeNull();
    expect(screen.getByLabelText("Film")).toBeOnTheScreen();
  });

  it("scrolls the listing inside its own height rather than down the sheet", async () => {
    await showing();
    const offered = screen.getByTestId("offered");

    expect(
      Number(StyleSheet.flatten(offered.props["style"]).maxHeight),
    ).toBeGreaterThan(0);
    expect(offered).toHaveProp("keyboardShouldPersistTaps", "handled");
  });

  it("gathers what is playing under a name a screen reader can say", async () => {
    await showing();

    expect(screen.getByLabelText("Films playing near 75234")).toBeOnTheScreen();
  });

  it("draws an edge round each film it offers rather than letting the fill end itself", async () => {
    await showing();
    const suggestion = StyleSheet.flatten(
      screen.getByRole("button", { name: "Akira" }).props["style"],
    );

    expect(String(suggestion.backgroundColor)).toMatch(/^#[0-9a-f]{6}$/);
    expect(String(suggestion.borderColor)).toMatch(/^#[0-9a-f]{6}$/);
    expect(suggestion.borderColor).not.toBe(suggestion.backgroundColor);
  });

  it("says when the listing could not be read, and blocks nothing", async () => {
    await showing({
      programme: { phase: "unreachable", theaters: [], movies: [] },
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "What is playing near 75234 could not be read.",
    );
    expect(screen.getByLabelText("Film")).toBeOnTheScreen();
  });

  it("names the Theaters it could not read, and still offers the films that answered", async () => {
    await showing({
      programme: {
        ...READ,
        unreached: nearby("aacbt", "Cinemark Dallas XD and IMAX"),
      },
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Films at 1 theater could not be read: Cinemark Dallas XD and IMAX.",
    );
    expect(screen.getByRole("button", { name: "Akira" })).toBeOnTheScreen();
  });

  for (const appearance of APPEARANCES)
    it(`sets a listing it could not read apart from one it could, legibly, lights ${appearance}`, async () => {
      const calm = await toneOf(appearance, READ);
      const amiss = await toneOf(appearance, {
        phase: "unreachable",
        theaters: [],
        movies: [],
      });

      const house = themeFor(appearance).colours.house;

      expect(amiss).not.toBe(calm);
      expect(contrastOf(house, amiss)).toBeGreaterThanOrEqual(4.5);
      expect(contrastOf(house, calm)).toBeGreaterThanOrEqual(4.5);
    });
});
