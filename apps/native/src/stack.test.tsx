import {
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { REFERENCE } from "@seatscout/client";
import { BACK_TO_THE_LIST } from "@seatscout/view-logic";
import { act, fireEvent, screen, within } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { StyleSheet } from "react-native";
import { nearby as mockNearby, phone as mockPhone } from "../test/phone.js";
import { WARM_UP, warmTheCorpus } from "../test/rooms.js";
import Layout, { unstable_settings } from "./app/_layout.js";
import Ask from "./app/ask.js";
import HandOffRoute from "./app/hand-off.js";
import Index from "./app/index.js";
import LedgerRoute from "./app/ledger.js";
import RoomRoute from "./app/room.js";
import { seatProfile } from "./host/source.js";

const mockLoading = jest.fn<() => [boolean, Error | null]>(() => [true, null]);

jest.mock("expo-font", () => ({ useFonts: () => mockLoading() }));

jest.mock("expo-network", () => ({
  useNetworkState: () => ({ isConnected: true, isInternetReachable: true }),
}));

jest.mock("./host/source.js", () => {
  const { heldProfile } = require("./host/profile.js");
  const { seatscout } = mockPhone([], {
    script: {},
    playing: {
      area: "75234",
      date: "2026-09-19",
      programme: {
        theaters: mockNearby("aacbt", "Cinemark Dallas XD and IMAX"),
        movies: [{ id: "23184", title: "Akira" }],
        unreached: [],
      },
    },
  });
  return { seatscout, seatProfile: heldProfile(seatscout) };
});

const LISTED =
  "/?movie=246427&date=2026-08-28&area=75006&partySize=2&from=19:00&until=19:20";

beforeAll(warmTheCorpus, WARM_UP);

const opened = (initialUrl = "/") =>
  renderRouter(
    {
      _layout: { default: Layout, unstable_settings },
      index: Index,
      ask: Ask,
      room: RoomRoute,
      "hand-off": HandOffRoute,
      ledger: LedgerRoute,
    },
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

const ranked = async () => {
  const app = opened(LISTED);
  await app;
  await screen.findByText("Best seats first");
  return { at: () => app.getPathname() };
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
  it("writes what the sheet states into the Search route's parameters, several days included", async () => {
    const { app } = await asked();

    await fireEvent.changeText(
      screen.getByLabelText("Near, by postal code"),
      "75234",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Any day" }));
    await commit();

    expect(app.getPathname()).toBe("/");
    expect(app.getSearchParams()).toMatchObject({
      area: "75234",
      partySize: "2",
      date: "any",
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

describe("what the sheet changes beyond the address", () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    await act(() => seatProfile.choose(REFERENCE));
  });

  it("draws neither screen until the phone's Seat Profile has been read, so no search runs twice", async () => {
    jest.spyOn(seatProfile, "snapshot").mockReturnValue(undefined);
    await opened();
    expect(screen.queryByRole("button", { name: "Find seats" })).toBeNull();
    await opened("/ask?term=movie&area=75234");
    expect(screen.queryByText("What are we seeing?")).toBeNull();
  });

  it("runs the search again under a Seat Profile moved in the sheet, and keeps it on the phone", async () => {
    await ranked();
    await fireEvent.press(
      screen.getByRole("button", { name: "Reference seat" }),
    );
    await screen.findByText("What are we seeing?");
    await fireEvent(screen.getByLabelText("How far back"), "valueChange", 0.1);
    await commit();

    expect(
      await screen.findByRole("button", { name: "Custom seat" }),
    ).toBeOnTheScreen();
    expect(seatProfile.snapshot()?.targetDepth).toBe(0.1);
  });
});

describe("a deep link that carries a whole query", () => {
  it("ranks Seat Groups on the root screen without Ask ever opening", async () => {
    const listed = await ranked();

    expect(listed.at()).toBe("/");
    expect(screen.getAllByTestId("card").length).toBeGreaterThan(0);
  });

  it("pushes the room when a card's body is pressed", async () => {
    const listed = await ranked();
    const [body] = screen.getAllByTestId("body");
    if (body === undefined) throw new Error("no card was drawn");

    await fireEvent.press(body);
    await screen.findByText(`‹ ${BACK_TO_THE_LIST}`);

    expect(listed.at()).toBe("/room");
  });

  it("presents the hand-off when a card's Seat label is pressed", async () => {
    const listed = await ranked();
    const [seats] = screen.getAllByTestId("seats");
    if (seats === undefined) throw new Error("no Seat label was drawn");

    await fireEvent.press(seats);
    await screen.findByText("Taking the seats");

    expect(listed.at()).toBe("/hand-off");
  });

  it("presents the ledger from the coverage strip above the list", async () => {
    const listed = await ranked();

    await fireEvent.press(screen.getByRole("button", { name: "ledger ›" }));
    await screen.findByText("Every showtime, accounted for");

    expect(listed.at()).toBe("/ledger");
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
