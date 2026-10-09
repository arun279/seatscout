import { createSeatScout, type Snapshot } from "@seatscout/client";
import { fakeUpstream } from "@seatscout/client/testing";
import { describe, expect, it } from "vitest";
import {
  ACCOUNTED_FOR,
  type LedgerRow,
  ledgerOf,
  sumOf,
} from "./ledger-phrases.js";
import {
  COOLED,
  covering,
  day,
  reading,
  TODAY,
} from "./results-phrases.fixtures.js";

const UNREACHED_ROOM = "/napi/seatMap/562169041";

const settledWhole = (): Promise<Snapshot> =>
  createSeatScout({
    fetch: fakeUpstream({
      seed: 4,
      standInAuditoriums: true,
      standInTheaters: true,
      sequences: { [UNREACHED_ROOM]: [500, 500, 500] },
    }),
    now: () => 0,
    wait: () => Promise.resolve(),
    random: () => 0,
  }).search({
    movie: "245893",
    dates: ["2026-09-20"],
    area: "75006",
    partySize: 2,
    accessibleSeating: false,
  }).done;

const clockAfter = (at: number): string =>
  at === COOLED ? "21:47" : "never this";

const CHECKED =
  "Seat maps read and judged. Every result on the list came from these.";

const SALES_OFF = [
  "10:45a",
  "11:45a",
  "1:30p",
  "2:30p",
  "4:15p",
  "5:15p",
  "7:00p",
  "8:00p",
  "9:45p",
].map((time) => `Studio Movie Grill Spring Valley · ${time}`);

const oneOfEachNamed = (settled: Snapshot): Snapshot => {
  const [noMap] = settled.coverage.noSeatMap;
  const [salesOff] = settled.coverage.salesOff;
  const [failed] = settled.coverage.failed;
  if (noMap === undefined || salesOff === undefined || failed === undefined)
    throw new Error("the corpus lost an outcome");
  const { id: _, ...unidentified } = salesOff;
  return reading(
    {
      candidates: 8,
      checked: 2,
      started: [failed],
      noSeatMap: [noMap],
      soldOut: [salesOff],
      salesOff: [salesOff],
      unidentified: [unidentified],
      failed: [failed],
    },
    "settled",
  );
};

const saidIn = (rows: readonly LedgerRow[]) =>
  rows.map((row) => ({ ...row, named: row.named.map(({ said }) => said) }));

describe("the ledger's rows", () => {
  it("counts what was checked and what was not read yet, names the rest, and leaves out what holds nothing", async () => {
    const settled = await settledWhole();

    expect(saidIn(ledgerOf(settled, clockAfter))).toEqual([
      {
        count: 47,
        label: "Checked",
        remedy: CHECKED,
        named: [],
        retry: null,
      },
      {
        count: 3,
        label: "No seat map",
        remedy:
          "General admission, so there are no seats to rank. A retry cannot change that.",
        named: [
          "Landmark Inwood Theatre · 2:35p",
          "Landmark Inwood Theatre · 4:45p",
          "Landmark Inwood Theatre · 7:00p",
        ],
        retry: null,
      },
      {
        count: 9,
        label: "Sales switched off",
        remedy:
          "The theater is not selling these, so no seat map was asked for.",
        named: SALES_OFF,
        retry: null,
      },
      {
        count: 1,
        label: "Could not be reached",
        remedy: "The room did not answer. Trying again may reach it.",
        named: ["Cinemark Dallas XD and IMAX · 10:45a"],
        retry: "Try Cinemark Dallas XD and IMAX again",
      },
      {
        count: 446,
        label: "Not read yet",
        remedy: "Not asked for yet. Read more from the list.",
        named: [],
        retry: null,
      },
    ]);
  });

  it("gives every outcome its own row and its own remedy, in the order the ledger keeps", async () => {
    const rows = ledgerOf(oneOfEachNamed(await settledWhole()), clockAfter);

    expect(rows.map(({ label, remedy }) => [label, remedy])).toEqual([
      ["Checked", CHECKED],
      [
        "Already started",
        "These had begun by the time the listing was read. Later showings stay on the list.",
      ],
      [
        "No seat map",
        "General admission, so there are no seats to rank. A retry cannot change that.",
      ],
      [
        "Sold out",
        "No seats left. Other times at the same theater stay on the list.",
      ],
      [
        "Sales switched off",
        "The theater is not selling these, so no seat map was asked for.",
      ],
      [
        "Never identified",
        "The listing gave nothing to ask for a seat map with, so none can be read.",
      ],
      [
        "Could not be reached",
        "The room did not answer. Trying again may reach it.",
      ],
    ]);
    expect(saidIn(rows).map((row) => row.named)).toEqual([
      [],
      ["Cinemark Dallas XD and IMAX · 10:45a"],
      ["Landmark Inwood Theatre · 2:35p"],
      ["Studio Movie Grill Spring Valley · 10:45a"],
      ["Studio Movie Grill Spring Valley · 10:45a"],
      ["Studio Movie Grill Spring Valley · 10:45a"],
      ["Cinemark Dallas XD and IMAX · 10:45a"],
    ]);
  });

  it("counts what is being read apart from what is not read yet, and offers no retry while the search runs", async () => {
    const { coverage } = await settledWhole();
    const running = reading(
      { ...covering(176, 84), failed: coverage.failed },
      "searching",
      [day(TODAY, 84, 51, 40)],
    );

    expect(
      ledgerOf(running, clockAfter).map(({ label, count, remedy, retry }) => [
        label,
        count,
        remedy,
        retry,
      ]),
    ).toEqual([
      ["Checked", 84, CHECKED, null],
      ["Could not be reached", 1, "The room did not answer.", null],
      ["Being read", 51, "Asked for, not answered yet.", null],
      ["Not read yet", 40, "Not asked for yet.", null],
    ]);
  });

  it("says the ticket site asked to slow down on what a refused search did not read, and offers no retry", async () => {
    const { coverage } = await settledWhole();
    const refused = reading(
      { ...covering(176, 84), failed: coverage.failed },
      "settled",
      [day(TODAY, 85, 0, 91)],
      COOLED,
    );

    expect(
      ledgerOf(refused, clockAfter).map(({ label, remedy, retry }) => [
        label,
        remedy,
        retry,
      ]),
    ).toEqual([
      ["Checked", CHECKED, null],
      ["Could not be reached", "The room did not answer.", null],
      [
        "Not read yet",
        "The ticket site asked us to slow down. Search again after 9:47p.",
        null,
      ],
    ]);
  });
});

describe("the ledger's heading", () => {
  it("says the sheet accounts for every showtime", () => {
    expect(ACCOUNTED_FOR).toBe("Every showtime, accounted for");
  });
});

describe("the ledger's arithmetic", () => {
  it("adds every row up to the candidates, in every reading of a search", async () => {
    expect(sumOf(await settledWhole(), clockAfter)).toBe(
      "47 + 3 + 9 + 1 + 446 = 506 candidates",
    );
    expect(
      sumOf(
        reading(covering(176, 84), "searching", [day(TODAY, 84, 52, 40)]),
        clockAfter,
      ),
    ).toBe("84 + 52 + 40 = 176 candidates");
  });

  it("says one candidate as one, and no candidates without a sum", () => {
    expect(sumOf(reading(covering(1, 1), "settled"), clockAfter)).toBe(
      "1 = 1 candidate",
    );
    expect(sumOf(reading(covering(0, 0), "settled"), clockAfter)).toBe(
      "0 candidates",
    );
  });

  it("says what the strip says before anything is counted", () => {
    expect(sumOf(reading(covering(0, 0), "resolving"), clockAfter)).toBe(
      "Reading the listing",
    );
    expect(sumOf(reading(covering(0, 0), "unreachable"), clockAfter)).toBe(
      "Nothing was read",
    );
  });
});
