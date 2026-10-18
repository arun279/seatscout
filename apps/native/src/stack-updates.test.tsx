import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { WARM_UP, warmTheCorpus } from "../test/rooms.js";
import { source as mockSource } from "../test/stack-phone.js";
import Layout, { unstable_settings } from "./app/_layout.js";
import Ask from "./app/ask.js";
import HandOffRoute from "./app/hand-off.js";
import Index from "./app/index.js";
import LedgerRoute from "./app/ledger.js";
import RoomRoute from "./app/room.js";

const mockReload = jest.fn<() => Promise<void>>();

jest.mock("expo-font", () => ({ useFonts: () => [true, null] }));

jest.mock("expo-network", () => ({
  useNetworkState: () => ({ isConnected: true, isInternetReachable: true }),
}));

jest.mock("expo-updates", () => ({
  isEnabled: false,
  useUpdates: () => ({ isUpdatePending: true }),
  reloadAsync: () => mockReload(),
}));

jest.mock("./host/source.js", () => mockSource);

beforeAll(warmTheCorpus, WARM_UP);

beforeEach(() => {
  mockReload.mockReset().mockResolvedValue(undefined);
});

const opening = async (initialUrl: string) => {
  await renderRouter(
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
  await screen.findByText("Two seats together");
};

describe("the app, with a downloaded update waiting", () => {
  it("runs it on the Search screen with nothing entered", async () => {
    await opening("/");

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it("holds it while a query is on the screen", async () => {
    await opening("/?area=75006");

    expect(mockReload).not.toHaveBeenCalled();
  });
});
