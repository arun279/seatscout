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
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { houseLights } from "../../test/lights.js";
import { type Fetch, phone, type Upstream } from "../../test/phone.js";
import { ASKED, WARM_UP } from "../../test/rooms.js";
import type { Appearance } from "../theme.js";
import { Ledger } from "./ledger.js";

const APPEARANCES: readonly Appearance[] = ["down", "up"];

const SEAT_MAP = "/napi/seatMap/";

const UNREACHED_ROOM = "/napi/seatMap/564362583";

const FAILING: Upstream = {
  script: { sequences: { [UNREACHED_ROOM]: [500, 500, 500] } },
};

const VERDICTS = [
  "Every showtime, accounted for",
  "Checked",
  "No seat map",
  "Could not be reached",
];

const refusing = (after: number): Upstream => {
  let answered = 0;
  return {
    script: {},
    through: (upstream) => (url, init) => {
      if (!url.includes(SEAT_MAP)) return upstream(url, init);
      answered += 1;
      return answered > after
        ? Promise.resolve({ status: 403, text: () => Promise.resolve("") })
        : upstream(url, init);
    },
  };
};

const never: Upstream = {
  script: {},
  through: (upstream: Fetch) => (url, init) =>
    url.includes(SEAT_MAP) ? new Promise(() => undefined) : upstream(url, init),
};

const opened = async ({
  upstream = FAILING,
  online = true,
}: {
  readonly upstream?: Upstream;
  readonly online?: boolean;
} = {}) => {
  const carried = phone([], upstream);
  const onClose = jest.fn<() => void>();
  await render(
    <Ledger
      asked={ASKED}
      onClose={onClose}
      online={online}
      seatscout={carried.seatscout}
    />,
  );
  return { ...carried, onClose };
};

const headers = () =>
  screen
    .getAllByRole("header")
    .map((header) => String(header.props["children"]));

beforeAll(async () => {
  await opened();
  await screen.findByText(/ candidates$/);
  await cleanup();
}, WARM_UP);

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("the ledger as it opens", () => {
  it("moves a screen reader to its heading, since no field in it takes the keyboard", async () => {
    const moved = jest.spyOn(AccessibilityInfo, "sendAccessibilityEvent");
    moved.mockClear();

    await opened();

    expect(moved.mock.calls.map(([, event]) => event)).toEqual(["focus"]);
    expect(
      screen.getByRole("header", { name: "Every showtime, accounted for" }),
    ).toBeOnTheScreen();
  });
});

describe("the ledger of a search that has stopped reading", () => {
  it.each(APPEARANCES)(
    "puts every showtime under one verdict and adds them up to the candidates, with the house lights %s",
    async (appearance) => {
      houseLights(appearance);
      await opened();

      expect(
        await screen.findByText("13 + 1 + 1 = 15 candidates"),
      ).toBeOnTheScreen();
      expect(headers()).toEqual(VERDICTS);
      expect(screen.getAllByTestId("ledger-row")).toHaveLength(3);
      expect(screen.getByText("AMC Stonebriar 24 · 7:15p")).toBeOnTheScreen();
      expect(screen.queryByText(/placeholder/)).toBeNull();
    },
  );

  it("offers the unreached row the list's retry and nothing else, and re-reads only what failed", async () => {
    const carried = await opened();
    await screen.findByText("13 + 1 + 1 = 15 candidates");

    expect(screen.getAllByRole("button")).toHaveLength(2);
    const read = carried.reads.length;

    await fireEvent.press(
      screen.getByRole("button", { name: "Try AMC Stonebriar 24 again" }),
    );

    expect(await screen.findByText("14 + 1 = 15 candidates")).toBeOnTheScreen();
    expect(carried.reads.slice(read)).toEqual([UNREACHED_ROOM]);
    expect(screen.queryByText("Could not be reached")).toBeNull();
  });

  it("waits for a connection instead of offering a retry it cannot make", async () => {
    await opened({ online: false });
    await screen.findByText("13 + 1 + 1 = 15 candidates");

    expect(
      screen.getByText("Waiting for a connection to retry"),
    ).toBeOnTheScreen();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("counts what the ticket site refused as not read yet, names when to search again, and offers no retry", async () => {
    await opened({ upstream: refusing(10) });

    expect(await screen.findByText("Not read yet")).toBeOnTheScreen();
    expect(
      screen.getByText(
        /^The ticket site asked us to slow down\. Search again after \d{1,2}:\d{2}[ap]\.$/,
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("10 + 1 + 4 = 15 candidates")).toBeOnTheScreen();
    expect(screen.getByRole("button")).toHaveAccessibleName("Back to the list");
  });

  it("goes back to the list from its own control", async () => {
    const carried = await opened();

    await fireEvent.press(
      screen.getByRole("button", { name: "Back to the list" }),
    );

    expect(carried.onClose).toHaveBeenCalledTimes(1);
  });
});

describe("the ledger of a search still reading", () => {
  it("counts what is being read and offers no retry until the search settles", async () => {
    await opened({ upstream: never });

    expect(await screen.findByText("Being read")).toBeOnTheScreen();
    expect(screen.getByText("Asked for, not answered yet.")).toBeOnTheScreen();
    expect(screen.getByRole("button")).toHaveAccessibleName("Back to the list");
  });

  it("says what the strip says before the listing is read, and counts nothing", async () => {
    await opened({
      upstream: {
        script: {},
        through: () => () => new Promise(() => undefined),
      },
    });
    await act(() => Promise.resolve());

    expect(screen.getByText("Reading the listing")).toBeOnTheScreen();
    expect(screen.queryAllByTestId("ledger-row")).toEqual([]);
  });
});
