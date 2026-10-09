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
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { type Fetch, type Phone, phone } from "../../test/phone.js";
import {
  NOW,
  TODAY,
  TONIGHT,
  WARM_UP,
  warmTheCorpus,
} from "../../test/rooms.js";
import type { Clock } from "../host/clock.js";
import { Search } from "./search.js";

const STILL: Clock = { now: () => NOW, subscribe: () => () => undefined };

const RAN = { movie: "246473", dates: [TODAY], area: "75006", partySize: 2 };

const nothing = () => undefined;

const opened = async (carried: Phone) => {
  await render(
    <Search
      clock={STILL}
      onAsk={nothing}
      onHandOff={nothing}
      onLedger={nothing}
      online
      onRoom={nothing}
      onAdjust={nothing}
      onRun={nothing}
      profile={REFERENCE}
      seatscout={carried.seatscout}
      terms={TONIGHT}
      today={TODAY}
    />,
  );
  return carried.seatscout;
};

const heldAtTheSeatMaps = () => {
  const waiting: (() => void)[] = [];
  return {
    through:
      (upstream: Fetch): Fetch =>
      (url, init) =>
        url.includes("/napi/seatMap/")
          ? new Promise((done) => {
              waiting.push(() => {
                done(upstream(url, init));
              });
            })
          : upstream(url, init),
    release: () => {
      for (const go of waiting.splice(0)) go();
    },
  };
};

beforeAll(warmTheCorpus, WARM_UP);

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("when a search is remembered", () => {
  it("remembers nothing while the search has not settled, and the search once it has", async () => {
    const gate = heldAtTheSeatMaps();
    const seatscout = await opened(
      phone([], { script: {}, through: gate.through }),
    );
    await screen.findByText(/^Reading \d+ seat maps$/);

    expect(await seatscout.recent.remembered()).toEqual([]);

    gate.release();
    await screen.findByText("The top of the list is a tie");

    await waitFor(async () => {
      expect(await seatscout.recent.remembered()).toEqual([RAN]);
    });
  });

  it("remembers a search once, however many times it settles", async () => {
    const carried = phone([], {
      script: { sequences: { "/napi/seatMap/564362583": [500, 500, 500] } },
    });
    const remember = jest.spyOn(carried.seatscout.recent, "remember");
    await opened(carried);

    await fireEvent.press(
      await screen.findByRole("button", {
        name: "Try AMC Stonebriar 24 again",
      }),
    );
    await waitFor(() => {
      expect(screen.queryByText("Could not be reached")).toBeNull();
    });

    expect(remember).toHaveBeenCalledTimes(1);
  });

  it("remembers nothing when the listing could not be read", async () => {
    const seatscout = await opened(
      phone([], { script: { faults: [{ status: 500, percent: 100 }] } }),
    );
    await screen.findByText("The listing could not be read.");

    expect(await seatscout.recent.remembered()).toEqual([]);
  });
});
