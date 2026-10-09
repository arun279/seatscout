import {
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { BACK_TO_THE_LIST } from "@seatscout/view-logic";
import {
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { Dimensions, StyleSheet } from "react-native";
import { WARM_UP, warmTheCorpus } from "../test/rooms.js";
import { source as mockSource } from "../test/stack-phone.js";
import Layout, { unstable_settings } from "./app/_layout.js";
import Ask from "./app/ask.js";
import HandOffRoute from "./app/hand-off.js";
import Index from "./app/index.js";
import LedgerRoute from "./app/ledger.js";
import RoomRoute from "./app/room.js";

jest.mock("expo-font", () => ({ useFonts: () => [true, null] }));

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

const ranked = async () => {
  const app = opened(LISTED);
  await app;
  await screen.findByText("Best seats first");
  return { at: () => app.getPathname() };
};

describe("the two panes a window 840 wide and up is laid out in", () => {
  const wide = () =>
    jest
      .spyOn(Dimensions, "get")
      .mockReturnValue({ fontScale: 1, height: 800, scale: 2, width: 1024 });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("puts the prompt face beside a pane that says what will appear in it", async () => {
    wide();
    await opened();

    expect(
      within(screen.getByTestId("list-pane")).getByRole("button", {
        name: "Name an area",
      }),
    ).toBeOnTheScreen();
    expect(
      within(screen.getByTestId("detail-pane")).getByText(
        "Open a showtime and its room draws here.",
      ),
    ).toBeOnTheScreen();
  });

  it("hangs the screen band across the list's pane, not the whole window", async () => {
    wide();
    await opened();

    const band = within(screen.getByTestId("list-pane")).getByTestId("screen", {
      includeHiddenElements: true,
    }).props;
    const width = Number(
      band["width"] ?? StyleSheet.flatten(band["style"]).width,
    );

    expect(width).toBe(248);
  });

  it("opens a card's room beside the list, with no way back because the list is still there", async () => {
    wide();
    const listed = await ranked();
    expect(
      within(screen.getByTestId("detail-pane")).getByText(
        "Open a showtime and its room draws here.",
      ),
    ).toBeOnTheScreen();
    const [body] = screen.getAllByTestId("body");
    if (body === undefined) throw new Error("no card was drawn");

    await fireEvent.press(body);
    const pane = within(screen.getByTestId("detail-pane"));
    expect(
      await pane.findByRole("button", { name: /^Take / }),
    ).toBeOnTheScreen();

    expect(listed.at()).toBe("/");
    expect(pane.queryByText(`‹ ${BACK_TO_THE_LIST}`)).toBeNull();
    expect(screen.getAllByTestId("card").length).toBeGreaterThan(0);
  });

  it("draws the room of the next card pressed in place of the last", async () => {
    wide();
    await ranked();
    const [first, second] = screen.getAllByTestId("body");
    if (first === undefined || second === undefined)
      throw new Error("two cards were not drawn");
    await fireEvent.press(first);
    const pane = within(screen.getByTestId("detail-pane"));
    await pane.findByRole("button", { name: /^Take / });
    const took = String(pane.getByText(/^Take /).props["children"]);

    await fireEvent.press(second);

    await waitFor(() => {
      expect(String(pane.getByText(/^Take /).props["children"])).not.toBe(took);
    });
  });
});

describe("a term the Search face changes in place", () => {
  it("changes the party where it sits, with no new screen to go back from", async () => {
    const app = opened();
    await app;

    await fireEvent(
      screen.getByTestId("menu Two seats together"),
      "pressAction",
      { nativeEvent: { event: "3" } },
    );

    expect(
      await screen.findByRole("button", { name: "Four seats together" }),
    ).toBeOnTheScreen();
    expect(app.getSearchParams()).toMatchObject({ partySize: "4" });
    expect(router.canGoBack()).toBe(false);
  });

  it("presents it at the party when the party menu cannot hold the number wanted", async () => {
    const app = opened();
    await app;

    await fireEvent(
      screen.getByTestId("menu Two seats together"),
      "pressAction",
      { nativeEvent: { event: "more" } },
    );
    await screen.findByText("What are we seeing?");

    expect(app.getPathname()).toBe("/ask");
    expect(app.getSearchParams()).toMatchObject({ term: "partySize" });
  });
});
