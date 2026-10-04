import { REFERENCE } from "@seatscout/client";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
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

const SLOW_DOWN =
  /^The source asked the app to slow down\. Search again after \d{1,2}:\d{2}[ap]\.$/;

const nothing = () => undefined;

const shown = async ({ upstream }: { readonly upstream: Upstream }) => {
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
      profile={REFERENCE}
      programme={NOTHING_READ}
      seatscout={carried.seatscout}
      terms={TONIGHT}
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

describe("a search the source refused", () => {
  it("says the Source refused, never that nothing matched, when it refused every seat map", async () => {
    await shown({
      upstream: {
        script: {},
        through: (upstream) => (url, init) =>
          url.includes(SEAT_MAP)
            ? Promise.resolve({ status: 403, text: () => Promise.resolve("") })
            : upstream(url, init),
      },
    });

    expect(
      await screen.findByText("The source refused, so the search stopped."),
    ).toBeOnTheScreen();
    expect(screen.getByText(SLOW_DOWN)).toBeOnTheScreen();
    expect(screen.queryByText(/^No showtime matches this query /)).toBeNull();
    expect(screen.queryAllByTestId("card")).toEqual([]);
  });

  it("keeps the rooms it read before a refusal on the list, and says in the strip that the source refused", async () => {
    let answered = 0;
    await shown({
      upstream: {
        script: {},
        through: (upstream) => (url, init) => {
          if (!url.includes(SEAT_MAP)) return upstream(url, init);
          answered += 1;
          return answered > 10
            ? Promise.resolve({ status: 403, text: () => Promise.resolve("") })
            : upstream(url, init);
        },
      },
    });

    expect((await screen.findAllByTestId("card")).length).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent(
      / · the source refused, so the search stopped$/,
    );
    expect(screen.queryByTestId("verdict")).toBeNull();
  });
});

describe("a search while the source is still refusing", () => {
  const UNTIL = new Date(2026, 8, 20, 21, 47, 30).getTime();

  it.each(APPEARANCES)(
    "names the minute it can search again and asks the source nothing, with the house lights %s",
    async (appearance) => {
      houseLights(appearance);
      const carried = await shown({
        upstream: { script: {}, coolingUntil: UNTIL },
      });

      expect(
        await screen.findByText(
          "The source asked the app to slow down. Search again after 9:48p.",
        ),
      ).toBeOnTheScreen();
      expect(screen.getByRole("header")).toHaveTextContent(
        "The source refused, so the search stopped.",
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        "Nothing was read: the source refused, so the search stopped",
      );
      expect(screen.queryByText("The listing could not be read.")).toBeNull();
      expect(carried.reads).toEqual([]);
    },
  );
});
