import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { NOTHING_REMEMBERED } from "@seatscout/view-logic";
import { act, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
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

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 8, 20, 12) });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Run again on the Prompt a search was run from", () => {
  it("offers the search once the person comes back to the Prompt", async () => {
    await renderRouter(
      {
        _layout: { default: Layout, unstable_settings },
        index: Index,
        ask: Ask,
        room: RoomRoute,
        "hand-off": HandOffRoute,
        ledger: LedgerRoute,
      },
      { initialUrl: "/" },
    );
    await screen.findByText(NOTHING_REMEMBERED);

    await act(() => router.push(LISTED));
    await screen.findByText("Best seats first");
    await act(() => router.back());

    expect(
      await screen.findByRole("button", { name: /, 2 seats · today · 75006$/ }),
    ).toBeOnTheScreen();
  });
});
