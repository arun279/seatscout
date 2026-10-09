import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { act, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Dimensions } from "react-native";
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

beforeAll(warmTheCorpus, WARM_UP);

const scaledTo = (fontScale: number) => {
  Dimensions.set({
    window: { ...Dimensions.get("window"), fontScale },
    screen: { ...Dimensions.get("screen"), fontScale },
  });
};

describe("the app, when the reader changes the text size while it is open", () => {
  it("draws the words already on screen again, so none keeps the height of the old size", async () => {
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
    const before = screen.getByText("Two seats together");

    await act(() => scaledTo(3));

    expect(screen.getByText("Two seats together")).not.toBe(before);
    await act(() => scaledTo(2));
  });
});
