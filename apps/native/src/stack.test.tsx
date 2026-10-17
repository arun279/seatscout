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
import { WARM_UP, warmTheCorpus } from "../test/rooms.js";
import { source as mockSource } from "../test/stack-phone.js";
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

jest.mock("./host/source.js", () => mockSource);

const LISTED =
  "/?movie=246473&date=2026-09-20&area=75006&partySize=2&from=19:00&until=19:20";

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

const asked = async (initialUrl: string, heading: string) => {
  const app = opened(initialUrl);
  await app;
  await screen.findByRole("header", { name: heading });
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
      screen.getByRole("button", { name: "Name an area" }),
    ).toBeOnTheScreen();
  });

  it("presents the area's editor over it when the velvet control is pressed", async () => {
    const app = opened();
    await app;

    await fireEvent.press(screen.getByRole("button", { name: "Name an area" }));
    await screen.findByRole("header", { name: "Near where?" });

    expect(app.getPathname()).toBe("/ask");
    expect(app.getSearchParams()).toMatchObject({ term: "area" });
  });

  it("presents the editor of the term a title-card row names when it is pressed", async () => {
    const app = opened();
    await app;

    await fireEvent.press(
      screen.getByRole("button", { name: "Two seats together" }),
    );
    await screen.findByRole("header", { name: "How many seats?" });

    expect(app.getPathname()).toBe("/ask");
    expect(app.getSearchParams()).toMatchObject({ term: "partySize" });
  });

  it("presents the editor of the term a chip names when it is pressed", async () => {
    const app = opened();
    await app;

    await fireEvent.press(screen.getByRole("button", { name: "Any time" }));
    await screen.findByRole("header", { name: "What time?" });

    expect(app.getSearchParams()).toMatchObject({ term: "window" });
  });

  it("opens the film's editor holding the query the screen beneath it was showing", async () => {
    const app = opened("/?area=75234&partySize=3");
    await app;

    await fireEvent.press(screen.getByRole("button", { name: "Pick a movie" }));
    await screen.findByRole("header", { name: "Which movie?" });

    expect(app.getSearchParams()).toMatchObject({
      area: "75234",
      partySize: "3",
      term: "movie",
    });
  });

  it("keeps the Search screen under the sheet when the sheet itself is the link that was opened", async () => {
    const app = opened("/ask?term=movie&area=75234");
    await app;
    await screen.findByRole("header", { name: "Which movie?" });

    await fireEvent.press(
      screen.getByRole("button", { name: "Keep as it was" }),
    );

    expect(app.getPathname()).toBe("/");
    expect(
      screen.getByRole("button", { name: "Name an area" }),
    ).toBeOnTheScreen();
  });

  it("stands the sheet on the same ground the screen beneath it uses", async () => {
    const app = opened();
    await app;
    await fireEvent.press(screen.getByRole("button", { name: "Name an area" }));
    await screen.findByRole("header", { name: "Near where?" });

    const sheet = StyleSheet.flatten(
      screen.getAllByTestId("stage").at(-1)?.props["style"],
    );

    expect(String(sheet.backgroundColor)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("the Query a search is", () => {
  it("writes what the sheet states into the Search route's parameters", async () => {
    const { app } = await asked(
      "/ask?term=area&movie=246473&date=2026-09-20&partySize=2&from=19:00&until=19:20",
      "Near where?",
    );

    await fireEvent.changeText(
      screen.getByLabelText("Near, by postal code"),
      "75006",
    );
    await commit();

    expect(app.getPathname()).toBe("/");
    expect(app.getSearchParams()).toMatchObject({
      area: "75006",
      movie: "246473",
      partySize: "2",
    });
  });

  it("leaves the sheet closed behind it, so the query before it is what back returns to", async () => {
    await asked(`/ask${LISTED.slice(1)}&term=partySize`, "How many seats?");

    await commit();

    expect(
      screen.queryByRole("header", { name: "How many seats?" }),
    ).toBeNull();
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
    await act(() => seatProfile().choose(REFERENCE));
  });

  it("draws neither screen until the phone's Seat Profile has been read, so no search runs twice", async () => {
    jest.spyOn(seatProfile(), "snapshot").mockReturnValue(undefined);
    await opened();
    expect(screen.queryByRole("button", { name: "Name an area" })).toBeNull();
    await opened("/ask?term=movie&area=75234");
    expect(screen.queryByRole("header", { name: "Which movie?" })).toBeNull();
  });

  it("runs the search again under a Seat Profile moved in the sheet, and keeps it on the phone", async () => {
    await ranked();
    await fireEvent.press(
      screen.getByRole("button", { name: "Reference seat" }),
    );
    await screen.findByRole("header", { name: "Where you sit" });
    await fireEvent(screen.getByLabelText("How far back"), "valueChange", 0.1);
    await commit();

    expect(
      await screen.findByRole("button", { name: "Custom seat" }),
    ).toBeOnTheScreen();
    expect(seatProfile().snapshot()?.targetDepth).toBe(0.1);
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
    await screen.findByRole("button", { name: /^Take / });

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

    expect(screen.queryByRole("button", { name: "Name an area" })).toBeNull();
  });

  it("draws it anyway when a face cannot be read, so the platform's own still reads", async () => {
    mockLoading.mockReturnValue([false, new Error("no face")]);

    await opened();

    expect(
      screen.getByRole("button", { name: "Name an area" }),
    ).toBeOnTheScreen();
  });
});
