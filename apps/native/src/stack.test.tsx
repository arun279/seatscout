import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, screen, within } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { StyleSheet } from "react-native";
import { nearby as mockNearby, phone as mockPhone } from "../test/phone.js";
import Layout, { unstable_settings } from "./app/_layout.js";
import Ask from "./app/ask.js";
import Index from "./app/index.js";

const mockLoading = jest.fn<() => [boolean, Error | null]>(() => [true, null]);

jest.mock("expo-font", () => ({ useFonts: () => mockLoading() }));

jest.mock("./host/source.js", () => ({
  seatscout: mockPhone([], {
    area: "75234",
    date: "2026-09-19",
    programme: {
      theaters: mockNearby("aacbt", "Cinemark Dallas XD and IMAX"),
      movies: [{ id: "23184", title: "Akira" }],
      unreached: [],
    },
  }).seatscout,
}));

const opened = (initialUrl = "/") =>
  renderRouter(
    { _layout: { default: Layout, unstable_settings }, index: Index, ask: Ask },
    { initialUrl },
  );

const asked = async () => {
  const app = opened();
  await app;
  await fireEvent.press(screen.getByRole("button", { name: "Find seats" }));
  await screen.findByText("What are we seeing?");
  return { app };
};

const commit = async () => {
  await fireEvent.press(
    within(screen.getByTestId("dock")).getByRole("button", {
      name: "Find seats",
    }),
  );
};

describe("the stack the app opens on", () => {
  it("opens on the Search screen's prompt face", async () => {
    const app = opened();
    await app;

    expect(app.getPathname()).toBe("/");
    expect(
      screen.getByRole("button", { name: "Find seats" }),
    ).toBeOnTheScreen();
  });

  it("presents the Ask sheet over it when the velvet control is pressed", async () => {
    const app = opened();
    await app;

    await fireEvent.press(screen.getByRole("button", { name: "Find seats" }));
    await screen.findByText("What are we seeing?");

    expect(app.getPathname()).toBe("/ask");
  });

  it("presents it when a title-card line is pressed too, at the term that line names", async () => {
    const app = opened();
    await app;

    await fireEvent.press(
      screen.getByRole("button", { name: "Two seats together" }),
    );
    await screen.findByText("What are we seeing?");

    expect(app.getPathname()).toBe("/ask");
    expect(app.getSearchParams()).toMatchObject({ term: "partySize" });
  });

  it("opens the sheet holding the query the screen beneath it was showing", async () => {
    const app = opened("/?area=75234&partySize=3");
    await app;

    await fireEvent.press(screen.getByRole("button", { name: "Find seats" }));
    await screen.findByText("What are we seeing?");

    expect(app.getSearchParams()).toMatchObject({
      area: "75234",
      partySize: "3",
      term: "movie",
    });
  });

  it("keeps the Search screen under the sheet when the sheet itself is the link that was opened", async () => {
    const app = opened("/ask?term=movie&area=75234");
    await app;
    await screen.findByText("What are we seeing?");

    await fireEvent.press(
      screen.getByRole("button", { name: "Keep as it was" }),
    );

    expect(app.getPathname()).toBe("/");
    expect(
      screen.getByRole("button", { name: "Find seats" }),
    ).toBeOnTheScreen();
  });

  it("stands the sheet on the same ground the screen beneath it uses", async () => {
    const app = opened();
    await app;
    await fireEvent.press(screen.getByRole("button", { name: "Find seats" }));
    await screen.findByText("What are we seeing?");

    const sheet = StyleSheet.flatten(
      screen.getAllByTestId("stage").at(-1)?.props["style"],
    );

    expect(String(sheet.backgroundColor)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("the Query a search is", () => {
  it("writes what the sheet states into the Search route's parameters", async () => {
    const { app } = await asked();

    await fireEvent.changeText(
      screen.getByLabelText("Near, by postal code"),
      "75234",
    );
    await commit();

    expect(app.getPathname()).toBe("/");
    expect(app.getSearchParams()).toMatchObject({
      area: "75234",
      partySize: "2",
    });
  });

  it("leaves the sheet closed behind it, so the query before it is what back returns to", async () => {
    await asked();

    await commit();

    expect(screen.queryByText("What are we seeing?")).toBeNull();
  });

  it("states the same query again when the same link is opened cold", async () => {
    const app = opened("/?area=75234&movie=23184&partySize=3&date=2026-09-19");
    await app;

    expect(
      screen.getByRole("button", { name: "Three seats together" }),
    ).toBeOnTheScreen();
    expect(
      await screen.findByRole("button", { name: "Near 75234" }),
    ).toBeOnTheScreen();
    expect(app.getSearchParams()).toMatchObject({ movie: "23184" });
  });
});

describe("the faces the app is set in", () => {
  afterEach(() => {
    mockLoading.mockReturnValue([true, null]);
  });

  it("holds the screen back until they have loaded", async () => {
    mockLoading.mockReturnValue([false, null]);

    await opened();

    expect(screen.queryByRole("button", { name: "Find seats" })).toBeNull();
  });

  it("draws it anyway when a face cannot be read, so the platform's own still reads", async () => {
    mockLoading.mockReturnValue([false, new Error("no face")]);

    await opened();

    expect(
      screen.getByRole("button", { name: "Find seats" }),
    ).toBeOnTheScreen();
  });
});
