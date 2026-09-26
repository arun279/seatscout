import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { dayNameOf, spanOf, whenWordsOf } from "@seatscout/view-logic";
import {
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { source as mockSource, reads } from "../test/stack-phone.js";
import { WARM_UP, warmTheCorpus } from "../test/rooms.js";
import Layout, { unstable_settings } from "./app/_layout.js";
import Ask from "./app/ask.js";
import HandOffRoute from "./app/hand-off.js";
import Index from "./app/index.js";
import LedgerRoute from "./app/ledger.js";
import RoomRoute from "./app/room.js";
import { pairsOf } from "./host/address.js";
import { listingDate } from "./host/clock.js";

jest.mock("expo-font", () => ({ useFonts: () => [true, null] }));

jest.mock("expo-network", () => ({
  useNetworkState: () => ({ isConnected: true, isInternetReachable: true }),
}));

jest.mock("./host/source.js", () => mockSource);

const LISTINGS = "/napi/theaterShowtimeGroupings/";

beforeAll(warmTheCorpus, WARM_UP);

const dayFrom = (ahead: number) => {
  const day = new Date();
  day.setDate(day.getDate() + ahead);
  return day;
};

const pick = async (day: Date, today: string) => {
  const name = dayNameOf(listingDate(day), today);
  if (screen.queryByRole("button", { name }) === null)
    await fireEvent.press(screen.getByRole("button", { name: "Next month" }));
  await fireEvent.press(screen.getByRole("button", { name }));
};

describe("several days picked in the sheet", () => {
  it("reach the results, which name them nearest first and read every one of them", async () => {
    const [later, sooner] = [dayFrom(3), dayFrom(2)];
    const today = listingDate(dayFrom(0));
    const picked = [today, listingDate(sooner), listingDate(later)];
    const app = renderRouter(
      {
        _layout: { default: Layout, unstable_settings },
        index: Index,
        ask: Ask,
        room: RoomRoute,
        "hand-off": HandOffRoute,
        ledger: LedgerRoute,
      },
      { initialUrl: "/ask?term=movie&area=75234&movie=23184&partySize=2" },
    );
    await app;
    await screen.findByText("What are we seeing?");
    const before = reads.length;

    await fireEvent.press(screen.getByRole("button", { name: "Some days" }));
    await pick(sooner, today);
    await pick(later, today);
    await fireEvent.press(
      within(screen.getByTestId("dock")).getByRole("button", {
        name: "Find seats",
      }),
    );

    expect(
      pairsOf(app.getSearchParams())
        .filter(([name]) => name === "date")
        .map(([, date]) => date),
    ).toEqual(picked);
    expect(
      await screen.findByRole("button", {
        name: whenWordsOf(spanOf(picked, today), today),
      }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Today" })).toBeNull();
    await waitFor(() => {
      const listings = reads
        .slice(before)
        .filter((url) => url.includes(LISTINGS));
      expect(
        picked.map((date) => listings.some((url) => url.includes(`/${date}?`))),
      ).toEqual([true, true, true]);
    });
  });
});
