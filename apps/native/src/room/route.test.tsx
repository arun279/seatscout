import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { createSeatScout, REFERENCE } from "@seatscout/client";
import { fakeUpstream } from "@seatscout/client/testing";
import { BACK_TO_THE_LIST, labelOf, takeOf } from "@seatscout/view-logic";
import {
  openedRooms,
  roomRoutes,
  VILLAGE_1,
} from "@seatscout/view-logic/testing";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { StyleSheet } from "react-native";
import { houseLights } from "../../test/lights.js";
import Layout, { unstable_settings } from "../app/_layout.js";
import Ask from "../app/ask.js";
import HandOffRoute from "../app/hand-off.js";
import Index from "../app/index.js";
import LedgerRoute from "../app/ledger.js";
import RoomRoute from "../app/room.js";
import { seatProfile } from "../host/source.js";
import { themeFor } from "../theme.js";
import { listLink, roomLink } from "./room.fixtures.js";

jest.mock("react-native/Libraries/Utilities/useColorScheme");
jest.mock("expo-font", () => ({ useFonts: () => [true, null] }));
jest.mock("expo-network", () => ({
  useNetworkState: () => ({ isInternetReachable: true }),
}));
const mockReads: string[] = [];
const mockHeld: (() => void)[] = [];
let mockHolding = false;

function mockSource() {
  const upstream = fakeUpstream({
    seed: 4,
    standInAuditoriums: true,
    routes: roomRoutes(),
  });
  return createSeatScout({
    fetch: (url, init) => {
      mockReads.push(url);
      return mockHolding && url.includes("/napi/seatMap/")
        ? new Promise((done) => {
            mockHeld.push(() => {
              done(upstream(url, init));
            });
          })
        : upstream(url, init);
    },
    now: () => 1000,
    wait: () => Promise.resolve(),
    random: () => 0.5,
  });
}

jest.mock("../host/source.js", () => {
  const { heldProfile } = require("../host/profile.js");
  const seatscout = mockSource();
  return { seatscout, seatProfile: heldProfile(seatscout) };
});

const THEATER = "AMC Village on the Parkway 9";

const opened = (url: string) =>
  renderRouter(
    {
      _layout: { default: Layout, unstable_settings },
      index: Index,
      ask: Ask,
      room: RoomRoute,
      "hand-off": HandOffRoute,
      ledger: LedgerRoute,
    },
    { initialUrl: url },
  );

const settled = async (app: PromiseLike<unknown>) => {
  await app;
  await screen.findByText(THEATER);
};

const release = () => {
  mockHolding = false;
  for (const go of mockHeld.splice(0)) go();
};

afterEach(release);

const checkedCount = () =>
  screen
    .getAllByRole("radio")
    .filter((held) => held.props["accessibilityState"].checked === true).length;

const isChecked = (label: string) =>
  screen.getByRole("radio", { name: new RegExp(`^${label} `) }).props[
    "accessibilityState"
  ].checked;

describe("the Room a card on the list opens", () => {
  it("draws the room the list already read, without reading a source again", async () => {
    seatProfile.choose({ ...REFERENCE, rowPitch: 0 });
    const app = opened(listLink);
    await app;
    const [card] = await screen.findAllByRole("button", { name: /^See / });
    if (card === undefined) throw new Error("the list drew no card");
    const read = mockReads.length;

    await fireEvent.press(card);
    await screen.findByText(`‹ ${BACK_TO_THE_LIST}`);

    expect(app.getPathname()).toBe("/room");
    expect(Object.keys(app.getSearchParams())).toEqual(
      expect.arrayContaining(["showtime", "group"]),
    );
    expect(mockReads).toHaveLength(read);
    await act(() => seatProfile.choose(REFERENCE));
  });
});

describe("the Room a deep link opens", () => {
  it("draws nothing and reads nothing when the link carries no query that can run", async () => {
    const before = mockReads.length;
    const app = opened(`/room?showtime=${VILLAGE_1.showtime}`);
    await app;

    expect(app.getPathname()).toBe("/room");
    expect(screen.queryByText(`‹ ${BACK_TO_THE_LIST}`)).toBeNull();
    expect(mockReads).toHaveLength(before);
  });

  it("draws the room the Showtime in the link names", async () => {
    const app = opened(roomLink(VILLAGE_1.showtime));
    await settled(app);

    expect(screen.getByText(THEATER)).toBeOnTheScreen();
    expect(app.getPathname()).toBe("/room");
  });

  it("opens on the Seat Group the link names rather than the recommendation", async () => {
    const [room] = await openedRooms(undefined, [VILLAGE_1]);
    if (room === undefined) throw new Error("the room was never opened");
    const other = room.auditorium.offered.find(
      ({ group }) => group.key !== room.result.key,
    )?.group;
    if (other === undefined) throw new Error("the room offers one group");

    await settled(opened(roomLink(VILLAGE_1.showtime, other.key)));

    expect(checkedCount()).toBe(1);
    expect(isChecked(labelOf(other))).toBe(true);
  });

  it("falls back to the recommendation when the link names no Seat Group", async () => {
    const [room] = await openedRooms(undefined, [VILLAGE_1]);
    if (room === undefined) throw new Error("the room was never opened");

    await settled(opened(roomLink(VILLAGE_1.showtime)));

    expect(isChecked(labelOf(room.result))).toBe(true);
  });

  it("sends the dock's commit control to the hand-off, naming the group it carries", async () => {
    const [room] = await openedRooms(undefined, [VILLAGE_1]);
    if (room === undefined) throw new Error("the room was never opened");
    const other = room.auditorium.offered.find(
      ({ group }) => group.key !== room.result.key,
    )?.group;
    if (other === undefined) throw new Error("the room offers one group");
    const app = opened(roomLink(VILLAGE_1.showtime, other.key));
    await settled(app);

    await fireEvent.press(screen.getByTestId("velvet"));
    await screen.findByRole("button", { name: takeOf(other) });

    expect(app.getPathname()).toBe("/hand-off");
    expect(app.getSearchParams()).toMatchObject({ group: other.key });
  });
});

describe("the Room a deep link opens before its search has settled", () => {
  it("shows the line the list shows while the search reads, then the room", async () => {
    mockHolding = true;
    houseLights("up");
    await opened(roomLink(VILLAGE_1.showtime));

    expect(
      await screen.findByText(/^\d+ candidates · \d+ checked/),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("progress")).toBeOnTheScreen();
    expect(
      StyleSheet.flatten(screen.getByTestId("stage").props["style"])
        .backgroundColor,
    ).toBe(themeFor("up").colours.house);
    expect(screen.queryByText(THEATER)).toBeNull();

    release();

    expect(await screen.findByText(THEATER)).toBeOnTheScreen();
  });

  it("opens the ledger from that line, as the list does", async () => {
    mockHolding = true;
    const app = opened(roomLink(VILLAGE_1.showtime));
    await app;

    await fireEvent.press(
      await screen.findByRole("button", { name: "ledger ›" }),
    );

    expect(app.getPathname()).toBe("/ledger");

    release();
    await screen.findByText(THEATER, { includeHiddenElements: true });
  });
});
