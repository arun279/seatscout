import { REFERENCE, type SearchTerms } from "@seatscout/client";
import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import type { Terms } from "@seatscout/view-logic";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";
import {
  everyControlReachesTheTouchFloor,
  everyControlSaysWhatItIs,
} from "../../test/floors.js";
import { type Fetch, phone, type Upstream } from "../../test/phone.js";
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

const FAILING = { "/napi/seatMap/556375288": [500, 500, 500] };

const STILL: Clock = { now: () => NOW, subscribe: () => () => undefined };

interface Shown {
  readonly asked?: SearchTerms;
  readonly terms?: Terms;
  readonly online?: boolean;
  readonly upstream?: Upstream;
  readonly onLedger?: () => void;
}

const nothing = () => undefined;

const holding = () => {
  const waiting: (() => void)[] = [];
  return {
    through:
      (upstream: Fetch): Fetch =>
      (url, init) =>
        url.includes(SEAT_MAP)
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

const shown = async (over: Shown = {}) => {
  const carried = phone([], over.upstream ?? { script: {} });
  await render(
    <Results
      asked={over.asked ?? ASKED}
      clock={STILL}
      onEdit={nothing}
      onHandOff={nothing}
      onLedger={over.onLedger ?? nothing}
      online={over.online ?? true}
      onRoom={nothing}
      profile={REFERENCE}
      programme={NOTHING_READ}
      seatscout={carried.seatscout}
      terms={over.terms ?? TONIGHT}
      today={TODAY}
    />,
  );
  return carried;
};

const asking = (over: Partial<SearchTerms>): SearchTerms => ({
  ...ASKED,
  ...over,
});

beforeAll(async () => {
  await shown();
  await screen.findByText("The top of the list is a tie");
  await cleanup();
}, WARM_UP);

describe("the list once the ranking has stopped moving", () => {
  it("puts the best Seat Groups first and totals what it found", async () => {
    await shown();

    expect(
      await screen.findByText("The top of the list is a tie"),
    ).toBeOnTheScreen();
    expect(screen.getByRole("header")).toHaveTextContent(
      "The top of the list is a tie",
    );
    expect(screen.getByText(/^\d+ showtimes$/)).toBeOnTheScreen();
    expect(screen.getAllByTestId("card").length).toBeGreaterThan(0);
  });

  it("rules a line of light where what is below is measurably further", async () => {
    await shown();
    await screen.findByText("The top of the list is a tie");

    expect(screen.getByTestId("tie-rule")).toBeOnTheScreen();
    expect(screen.getByText(/^\d+ tied$/)).toBeOnTheScreen();
    expect(screen.getByText("below: measurably further")).toBeOnTheScreen();
  });

  it("calls the top no tie when only one result sits at the room's resolution", async () => {
    await shown({
      asked: asking({ from: `${TODAY}T19:00`, until: `${TODAY}T19:20` }),
    });

    expect(await screen.findByText("Best seats first")).toBeOnTheScreen();
    expect(screen.queryByTestId("tie-rule")).toBeNull();
  });

  it("draws every control it offers within a thumb's reach, each with a name", async () => {
    await shown();
    await screen.findByText("The top of the list is a tie");

    everyControlReachesTheTouchFloor();
    everyControlSaysWhatItIs();
  });
});

describe("the list while the ranking is still moving", () => {
  it("counts the seat maps being read and the showtimes found so far", async () => {
    const gate = holding();
    await shown({ upstream: { script: {}, through: gate.through } });

    expect(
      await screen.findByText(/^Reading \d+ seat maps$/),
    ).toBeOnTheScreen();
    expect(screen.getByText(/^\d+ showtimes so far$/)).toBeOnTheScreen();
    expect(screen.getByTestId("progress")).toBeOnTheScreen();
  });

  it("holds the list still while a finger is on it, and lets it move again on release", async () => {
    const gate = holding();
    await shown({ upstream: { script: {}, through: gate.through } });
    await screen.findByText(/^Reading \d+ seat maps$/);

    await fireEvent(screen.getByTestId("list"), "touchStart");
    gate.release();
    await screen.findByText(/^Reading \d+ seat maps$/);

    expect(screen.queryAllByTestId("card")).toEqual([]);

    await fireEvent(screen.getByTestId("list"), "touchEnd");

    expect((await screen.findAllByTestId("card")).length).toBeGreaterThan(0);
  });
});

describe("the search that did not reach every room", () => {
  it("counts what answered before the list, so a short list never looks whole", async () => {
    await shown({ upstream: { script: { sequences: FAILING } } });

    expect(
      await screen.findByText(/^From the \d+ rooms that answered$/),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("verdict")).toBeOnTheScreen();
    expect(screen.getByText("Could not be reached")).toBeOnTheScreen();
  });

  it("re-reads only what failed when the retry is pressed", async () => {
    const carried = await shown({
      upstream: { script: { sequences: FAILING } },
    });
    const again = await screen.findByRole("button", {
      name: /^Retry the .+ unreached$/,
    });
    const read = carried.reads.length;

    await fireEvent.press(again);
    await screen.findByText(/^\d+ candidates · \d+ checked$/);

    expect(new Set(carried.reads.slice(read))).toEqual(
      new Set(["/napi/seatMap/556375288"]),
    );
  });
});

describe("the searches that end with nothing to show", () => {
  it("says no room could seat the party when every candidate answered", async () => {
    await shown({
      asked: asking({ partySize: 60 }),
      terms: { ...TONIGHT, partySize: 60 },
    });

    expect(
      await screen.findByText(/^No 60 seats together, anywhere /),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Best seats first")).toBeNull();
  });

  it("says nothing was listed at all when no candidate matched the query", async () => {
    const window = { from: `${TODAY}T03:00`, until: `${TODAY}T04:00` };
    await shown({
      asked: asking(window),
      terms: { ...TONIGHT, from: "03:00", until: "04:00" },
    });

    expect(
      await screen.findByText(/^No showtime matches this query /),
    ).toBeOnTheScreen();
  });

  it("says the listing itself could not be read when the Source never answered", async () => {
    await shown({
      upstream: { script: { faults: [{ status: 500, percent: 100 }] } },
    });

    expect(
      await screen.findByText("The listing could not be read."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("status")).toHaveTextContent("Nothing was read");
    expect(screen.queryAllByTestId("card")).toEqual([]);
  });
});

describe("what the list offers while the phone is offline", () => {
  it("waits for a connection rather than offering a retry that cannot succeed", async () => {
    await shown({
      online: false,
      upstream: { script: { faults: [{ status: 500, percent: 100 }] } },
    });

    expect(
      await screen.findByText("Waiting for a connection to retry"),
    ).toBeOnTheScreen();
    expect(screen.queryAllByTestId("velvet")).toEqual([]);
  });
});

describe("the account the list keeps of its own search", () => {
  it("opens the ledger from the strip above the list", async () => {
    const opened = jest.fn<() => void>();
    await shown({ onLedger: opened });
    await screen.findByText("The top of the list is a tie");

    await fireEvent.press(screen.getByRole("button", { name: "ledger ›" }));

    expect(opened).toHaveBeenCalledTimes(1);
  });
});
