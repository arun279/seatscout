import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { REFERENCE } from "@seatscout/client";
import type { Terms } from "@seatscout/view-logic";
import { cleanup, render, screen } from "@testing-library/react-native";
import { houseLights } from "../../test/lights.js";
import { phone, type Upstream } from "../../test/phone.js";
import {
  ASKED,
  NOTHING_READ,
  NOW,
  TODAY,
  TONIGHT,
  WARM_UP,
} from "../../test/rooms.js";
import type { Clock } from "../host/clock.js";
import type { Appearance } from "../theme.js";
import { Results } from "./results.js";

const SEAT_MAP = "/napi/seatMap/";

const STILL: Clock = { now: () => NOW, subscribe: () => () => undefined };

const APPEARANCES: readonly Appearance[] = ["down", "up"];

const SLOW_DOWN = "The ticket site asked us to slow down.";

const SEARCH_AGAIN = / Search again after \d{1,2}:\d{2}[ap]\.$/;

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

const nothing = () => undefined;

const shown = async ({
  upstream,
  terms = TONIGHT,
}: {
  readonly upstream: Upstream;
  readonly terms?: Terms;
}) => {
  const carried = phone([], upstream);
  await render(
    <Results
      asked={ASKED}
      clock={STILL}
      onEdit={nothing}
      onHandOff={nothing}
      onLedger={nothing}
      online
      onRoom={nothing}
      onRun={() => undefined}
      profile={REFERENCE}
      programme={NOTHING_READ}
      seatscout={carried.seatscout}
      terms={terms}
      today={TODAY}
    />,
  );
  return carried;
};

beforeAll(async () => {
  await shown({ upstream: { script: {} } });
  await screen.findByText("The top of the list is a tie");
  await cleanup();
}, WARM_UP);

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("a search the ticket site refused", () => {
  it("says once that it was asked to slow down, never that nothing matched, when every seat map was refused", async () => {
    await shown({ upstream: refusing(0) });

    expect(await screen.findByText(SLOW_DOWN)).toBeOnTheScreen();
    expect(
      screen.getByText(
        /^Nothing was read, so this says nothing about seats yet\./,
      ),
    ).toHaveTextContent(SEARCH_AGAIN);
    expect(screen.getAllByText(/slow down/)).toHaveLength(1);
    expect(screen.queryByText(/^No showtime matches this query /)).toBeNull();
    expect(screen.queryAllByTestId("card")).toEqual([]);
  });

  it("keeps the rooms it read before a refusal on the list, under the same one verdict", async () => {
    await shown({ upstream: refusing(10) });

    expect((await screen.findAllByTestId("card")).length).toBeGreaterThan(0);
    expect(screen.getByText(SLOW_DOWN)).toBeOnTheScreen();
    expect(
      screen.getByText(
        /^Only 10 of \d+ rooms were read, so this says nothing about the rest yet\./,
      ),
    ).toHaveTextContent(SEARCH_AGAIN);
    expect(screen.getByTestId("list-head")).toBeOnTheScreen();
    expect(screen.getByRole("status")).not.toHaveTextContent(/slow down/);
  });
});

describe("a search while the ticket site is still refusing", () => {
  const UNTIL = new Date(2026, 8, 20, 21, 47, 30).getTime();

  it.each(APPEARANCES)(
    "names the film and the minute it can search again, says it once and asks the site nothing, with the house lights %s",
    async (appearance) => {
      houseLights(appearance);
      const carried = await shown({
        upstream: { script: {}, coolingUntil: UNTIL },
        terms: { ...TONIGHT, title: "Practical Magic 2 (2026)" },
      });

      expect(await screen.findByText(SLOW_DOWN)).toBeOnTheScreen();
      expect(
        screen.getByText(
          "Nothing was read, so this says nothing about seats yet. Search again after 9:48p.",
        ),
      ).toBeOnTheScreen();
      expect(screen.getByRole("status")).toHaveTextContent("Nothing read yet");
      expect(
        screen.getByRole("button", { name: "Practical Magic 2 (2026)" }),
      ).toBeOnTheScreen();
      expect(screen.queryByText(/246473/)).toBeNull();
      expect(screen.queryByText("The listing could not be read.")).toBeNull();
      expect(screen.queryByTestId("list-head")).toBeNull();
      expect(carried.reads).toEqual([]);
    },
  );
});
