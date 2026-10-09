import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { BACK_TO_THE_LIST } from "@seatscout/view-logic";
import { act, cleanup, fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { WARM_UP, warmTheCorpus } from "../test/rooms.js";
import { reads } from "../test/stack-phone.js";
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

jest.mock("./host/source.js", () => {
  const { heldProfile } = require("./host/profile.js");
  const { source } = require("../test/stack-phone.js");
  const { seatscout } = source;
  let mockRead = (): void => undefined;
  const read = new Promise<void>((done) => {
    mockRead = done;
  });
  return {
    seatscout,
    seatProfile: heldProfile({
      ...seatscout,
      profile: {
        ...seatscout.profile,
        remembered: () => read.then(() => seatscout.profile.remembered()),
      },
    }),
    readTheProfile: () => mockRead(),
  };
});

const LISTED =
  "/?movie=246473&date=2026-09-20&area=75006&partySize=2&from=19:00&until=19:20";

interface Routed {
  readonly routes: readonly {
    readonly name: string;
    readonly state?: Routed | undefined;
  }[];
}

const routesIn = (state: Routed | undefined): readonly string[] =>
  (state?.routes ?? []).flatMap((route) =>
    route.state === undefined ? [route.name] : routesIn(route.state),
  );

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

beforeAll(warmTheCorpus, WARM_UP);

describe("a room or a ledger opened from a link", () => {
  it("asks the Source nothing until the Seat Profile is read, so each joins the search the list runs", async () => {
    await opened(`/room${LISTED.slice(1)}&showtime=564362583&group=E12`);
    await cleanup();
    const app = opened(`/ledger${LISTED.slice(1)}`);
    await app;

    expect(screen.queryByText("Every showtime, accounted for")).toBeNull();
    expect(reads).toEqual([]);

    const { readTheProfile } = jest.requireMock<{
      readonly readTheProfile: () => void;
    }>("./host/source.js");
    await act(async () => readTheProfile());

    expect(await screen.findByText(/ = \d+ candidates$/)).toBeOnTheScreen();
    expect(app.getPathname()).toBe("/ledger");
  });
});

describe("the ledger over the list", () => {
  it("presents one ledger of the search on the list, however often the strip's link is pressed, and closes back onto it", async () => {
    const app = opened(LISTED);
    await app;
    await screen.findByText("Best seats first");
    const [candidates] = String(
      screen.getByRole("status").props["children"],
    ).split(" · ");
    const link = screen.getByRole("button", { name: "ledger ›" });

    await fireEvent.press(link);
    await fireEvent.press(link);
    await screen.findByText("Every showtime, accounted for");

    expect(app.getPathname()).toBe("/ledger");
    expect(routesIn(app.getRouterState())).toEqual(["index", "ledger"]);
    expect(screen.getByText(new RegExp(` = ${candidates}$`))).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", { name: BACK_TO_THE_LIST }),
    );

    expect(app.getPathname()).toBe("/");
  });

  it("goes to the list when a ledger link is opened with no search to account for", async () => {
    const app = opened("/ledger");
    await app;

    expect(app.getPathname()).toBe("/");
  });
});
