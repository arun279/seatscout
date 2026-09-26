import { REFERENCE, type SearchTerms } from "@seatscout/client";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";
import { phone } from "../../test/phone.js";
import {
  ASKED,
  NOTHING_READ,
  NOW,
  TODAY,
  TONIGHT,
  WARM_UP,
} from "../../test/rooms.js";
import type { Clock } from "../host/clock.js";
import { Results } from "./results.js";

const SEAT_MAP = "/napi/seatMap/";

const STILL: Clock = { now: () => NOW, subscribe: () => () => undefined };

const TWO_DAYS: SearchTerms = {
  movie: "245569",
  dates: ["2026-08-27", TODAY],
  area: "75006",
  partySize: 2,
  accessibleSeating: false,
};

const nothing = () => undefined;

const shown = async (asked: SearchTerms) => {
  const carried = phone([], { script: {} });
  await render(
    <Results
      asked={asked}
      clock={STILL}
      onEdit={nothing}
      onHandOff={nothing}
      onLedger={nothing}
      online
      onRoom={nothing}
      profile={REFERENCE}
      programme={NOTHING_READ}
      seatscout={carried.seatscout}
      terms={TONIGHT}
      today={TODAY}
    />,
  );
  return () => carried.reads.filter((read) => read.includes(SEAT_MAP)).length;
};

beforeAll(async () => {
  await shown(ASKED);
  await screen.findByText("The top of the list is a tie");
  await cleanup();
}, WARM_UP);

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("a search over several days with more to read", () => {
  it("offers to read more once it settles past its budget, and pressing it asks for the next 48 seat maps", async () => {
    const seatMaps = await shown(TWO_DAYS);
    const more = await screen.findByRole("button", {
      name: "Read 48 more rooms today",
    });

    expect(seatMaps()).toBe(48);
    expect(
      screen.getByText("Thu 27 Aug: no seat map to read"),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Today: 48 read · 124 not read yet"),
    ).toBeOnTheScreen();
    expect(screen.getByRole("status")).toHaveTextContent(
      "256 candidates · 48 checked · 124 not read yet",
    );

    await fireEvent.press(more);

    expect(
      await screen.findByText("256 candidates · 96 checked · 76 not read yet"),
    ).toBeOnTheScreen();
    expect(seatMaps()).toBe(96);
  });

  it("offers nothing more to a one-day search, which reads its whole listing", async () => {
    await shown(ASKED);
    await screen.findByText("The top of the list is a tie");

    expect(
      screen.queryByRole("button", { name: /^Read \d+ more rooms/ }),
    ).toBeNull();
    expect(screen.queryByText(/^Today: /)).toBeNull();
  });
});
