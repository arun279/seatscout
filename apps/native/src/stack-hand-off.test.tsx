import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { act, fireEvent, screen, within } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { WARM_UP, warmTheCorpus } from "../test/rooms.js";
import { routesIn } from "../test/routed.js";
import { source as mockSource, reads } from "../test/stack-phone.js";
import Layout, { unstable_settings } from "./app/_layout.js";
import Ask from "./app/ask.js";
import HandOffRoute from "./app/hand-off.js";
import Index from "./app/index.js";
import LedgerRoute from "./app/ledger.js";
import RoomRoute from "./app/room.js";

const mockBrowser = jest.fn<(url: string) => Promise<{ type: string }>>();

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: (url: string) => mockBrowser(url),
}));

jest.mock("expo-font", () => ({ useFonts: () => [true, null] }));

jest.mock("expo-network", () => ({
  useNetworkState: () => ({ isConnected: true, isInternetReachable: true }),
}));

jest.mock("./host/source.js", () => mockSource);

const LISTED =
  "/?movie=246473&date=2026-09-20&area=75006&partySize=2&from=19:00&until=19:20";

const opened = (initialUrl: string) =>
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
  return {
    at: () => app.getPathname(),
    routes: () => routesIn(app.getRouterState()),
  };
};

const seatLabel = (at: number) => {
  const seats = screen.getAllByTestId("seats")[at];
  if (seats === undefined) throw new Error("no Seat label was drawn");
  return seats;
};

beforeAll(warmTheCorpus, WARM_UP);

beforeEach(() => {
  mockBrowser.mockReset();
});

describe("the hand-off over the list", () => {
  it("returns to the list as it was when the in-app browser is closed", async () => {
    let closeTheBrowser = (): void => undefined;
    mockBrowser.mockReturnValue(
      new Promise((closed) => {
        closeTheBrowser = () => closed({ type: "cancel" });
      }),
    );
    const app = await ranked();
    const cards = screen.getAllByTestId("card").length;
    await fireEvent.press(seatLabel(0));
    await fireEvent.press(
      await screen.findByRole("button", { name: /^Take / }),
    );
    await screen.findByText(/^Still there/);
    const read = reads.length;

    expect(mockBrowser).toHaveBeenCalledTimes(1);
    expect(app.at()).toBe("/hand-off");

    await act(async () => closeTheBrowser());

    expect(app.at()).toBe("/");
    expect(screen.queryByText(/^Still there/)).toBeNull();
    expect(screen.getAllByTestId("card")).toHaveLength(cards);
    expect(reads).toHaveLength(read);
  });

  it("stands only one sheet on the list, however often a Seat label is pressed", async () => {
    const app = await ranked();
    const [one, other] = [seatLabel(0), seatLabel(1)];
    const later = String(within(other).getByText(/·/).props["children"]);

    await fireEvent.press(one);
    await fireEvent.press(other);

    expect(
      await screen.findByRole("button", {
        name: `Take ${later.split("·").join(" and ")}`,
      }),
    ).toBeOnTheScreen();
    expect(app.routes()).toEqual(["index", "hand-off"]);

    await act(() => router.back());

    expect(app.at()).toBe("/");
  });

  it("goes to the list when a hand-off link is opened with no Seat Group handed to it", async () => {
    const app = opened("/hand-off?group=564424799:E12+E11");
    await app;

    expect(app.getPathname()).toBe("/");
    expect(screen.queryByRole("button", { name: /^Take / })).toBeNull();
  });
});
