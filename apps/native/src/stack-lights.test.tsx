import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import type { HouseLights, KeyValueStore } from "@seatscout/client";
import { act, fireEvent, screen, within } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { StyleSheet } from "react-native";
import { houseLights } from "../test/lights.js";
import { WARM_UP, warmTheCorpus } from "../test/rooms.js";
import { source as mockSource } from "../test/stack-phone.js";
import Layout, { unstable_settings } from "./app/_layout.js";
import Ask from "./app/ask.js";
import HandOffRoute from "./app/hand-off.js";
import Index from "./app/index.js";
import LedgerRoute from "./app/ledger.js";
import RoomRoute from "./app/room.js";
import { type HeldLights, heldLights } from "./host/lights.js";

const DOWN_HOUSE = "#0d0f19";
const UP_HOUSE = "#f9f4e9";

const mockHeld: { current?: HeldLights } = {};

jest.mock("expo-font", () => ({ useFonts: () => [true, null] }));

jest.mock("expo-network", () => ({
  useNetworkState: () => ({ isConnected: true, isInternetReachable: true }),
}));

jest.mock("./host/source.js", () => ({
  ...mockSource,
  houseLights: () => mockHeld.current,
}));

beforeAll(warmTheCorpus, WARM_UP);

const phoneKeeping = (kept?: HouseLights) => {
  const written: unknown[] = [];
  let answer: () => void = () => undefined;
  const store: KeyValueStore = {
    read: () =>
      new Promise((settle) => {
        answer = () => settle(kept);
      }),
    write: (_key, value) => {
      written.push(value);
      return Promise.resolve();
    },
  };
  mockHeld.current = heldLights(store, () => undefined);
  return { answer: () => answer(), written };
};

const opened = () =>
  renderRouter(
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

const grounds = () =>
  screen
    .getAllByTestId("stage")
    .map((stage) => StyleSheet.flatten(stage.props["style"]).backgroundColor);

describe("the house lights across the app", () => {
  it("draws nothing until the phone has said which lights it kept, then draws under them", async () => {
    houseLights("down");
    const phone = phoneKeeping("up");
    await opened();

    expect(screen.queryByTestId("stage")).toBeNull();

    await act(phone.answer);

    expect(await screen.findByTestId("stage")).toBeOnTheScreen();
    expect(grounds()).toEqual([UP_HOUSE]);
  });

  it("offers them last on the first screen, after the searches the phone remembers", async () => {
    const phone = phoneKeeping();
    await opened();
    await act(phone.answer);
    const prompt = within(await screen.findByTestId("prompt"));

    expect(
      prompt
        .getAllByText(/^(Run again|House lights)$/)
        .map((heading) => heading.props["children"]),
    ).toEqual(["Run again", "House lights"]);
  });

  it("turns every screen to the lights pressed at once, and keeps the choice on the phone", async () => {
    houseLights("down");
    const phone = phoneKeeping();
    await opened();
    await act(phone.answer);

    await fireEvent.press(await screen.findByRole("button", { name: "Up" }));

    expect(grounds()).toEqual([UP_HOUSE]);
    expect(phone.written).toEqual(["up"]);

    await fireEvent.press(screen.getByRole("button", { name: "Name an area" }));
    await screen.findByRole("header", { name: "Near where?" });
    const sheet = screen.getByTestId("stage");

    expect(
      within(sheet).getByRole("header", { name: "Near where?" }),
    ).toBeOnTheScreen();
    expect(grounds()).toEqual([UP_HOUSE]);
  });

  it("follows the system again once its setting is chosen", async () => {
    houseLights("down");
    const phone = phoneKeeping("up");
    await opened();
    await act(phone.answer);

    await fireEvent.press(
      await screen.findByRole("button", { name: "System" }),
    );

    expect(grounds()).toEqual([DOWN_HOUSE]);
    expect(phone.written).toEqual(["system"]);
  });
});
