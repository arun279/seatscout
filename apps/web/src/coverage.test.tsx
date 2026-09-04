import "@testing-library/jest-dom/vitest";
import type { Snapshot } from "@seatscout/client";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ASKED, failing, settledAlone, staged } from "./app.fixtures.js";
import { Ledger } from "./coverage.js";

const ROWS: readonly (readonly [string, string, number])[] = [
  ["Candidates", "Showtimes matching your query when the search began.", 0],
  [
    "Checked",
    "Seat maps fetched and judged. Everything in the list came from these.",
    0,
  ],
  [
    "Already started",
    "The listing was read earlier; these had begun before we looked. Their next screenings are in the list.",
    0,
  ],
  [
    "No seat map",
    "General admission. There is nothing to rank, and retrying can never change that. Buy at the operator's page.",
    1,
  ],
  [
    "Sold out",
    "The room answered: nothing left. Other times at the same Theater remain in the list.",
    0,
  ],
  [
    "Sales switched off",
    "The listing says the Theater is not selling, so no request is spent. The operator's own page instead.",
    1,
  ],
  [
    "Never identified",
    "Listed with no identity to ask with, so no check can ever succeed. The operator's own page instead.",
    1,
  ],
  ["Could not be reached", "The only failure a retry can fix.", 0],
];

const oneOfEach = (settled: Snapshot): Snapshot => {
  const [sold] = settled.coverage.soldOut;
  const [noMap] = settled.coverage.noSeatMap;
  const [failed] = settled.coverage.failed;
  if (sold === undefined || noMap === undefined || failed === undefined)
    throw new Error("the corpus lost an outcome");
  const { id: _, ...unidentified } = noMap;
  return {
    ...settled,
    phase: "searching",
    coverage: {
      candidates: 8,
      checked: 1,
      soldOut: [sold],
      noSeatMap: [noMap],
      started: [failed],
      salesOff: [sold],
      unidentified: [unidentified],
      failed: [failed],
    },
  };
};

describe("the account the first screen keeps", () => {
  afterEach(cleanup);

  it("says it is reading the listing before anything is counted, then counts candidates and checks as they land", async () => {
    const stage = staged();

    expect(stage.asked).toEqual([ASKED]);
    expect(screen.getByRole("status")).toHaveTextContent("Reading the listing");
    expect(screen.queryByRole("button", { name: /ledger/i })).toBeNull();

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        /176 candidates · \d+ checked/,
      ),
    );
    expect(screen.getByRole("button", { name: /ledger/i })).toBeVisible();
    await stage.settled();
  });

  it("accounts for every candidate in the ledger, one count per outcome and never a ratio, and comes back to the list", async () => {
    const stage = staged({
      script: { sequences: failing([500, 500, 500]) },
    });
    const settled = await stage.settled();
    fireEvent.click(screen.getByRole("button", { name: /ledger/i }));

    const ledger = within(screen.getByRole("dialog", { name: /accounted/i }));
    expect(ledger.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Every showtime, accounted for.",
    );
    for (const [label] of ROWS) expect(ledger.getByText(label)).toBeVisible();
    expect(
      ledger.getByText(
        "170 + 0 + 3 + 1 + 0 + 0 + 2 = 176 · nothing unaccounted",
      ),
    ).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      /^176 candidates · 170 checked$/,
    );
    expect(ledger.queryByText(/%/)).toBeNull();
    expect(ledger.getAllByRole("list")).toHaveLength(4);
    expect(ledger.getByText("AMC Stonebriar 24 · 4:20p")).toBeVisible();
    expect(ledger.getByText("AMC Stonebriar 24 · 6:00p")).toBeVisible();
    expect(ledger.getByText("AMC Stonebriar 24 · 12:00p")).toBeVisible();
    expect(
      ledger
        .getAllByRole("link", { name: "operator's page ›" })
        .map((link) => link.getAttribute("href"))
        .toSorted(),
    ).toEqual(
      settled.coverage.noSeatMap
        .map((showtime) => showtime.ticketing)
        .toSorted(),
    );

    fireEvent.click(ledger.getByRole("button", { name: /back to the list/i }));

    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
  });

  it("explains every outcome, links the operator's page only where a retry can never help, and says what is still to come", async () => {
    const settled = await settledAlone({
      script: { sequences: failing([500, 500, 500]) },
    });
    render(<Ledger snapshot={oneOfEach(settled)} onClose={() => {}} />);

    const ledger = within(screen.getByRole("dialog", { name: /accounted/i }));
    for (const [label, remedy, links] of ROWS) {
      const row = ledger.getByRole("listitem", { name: label });
      expect(row).toHaveTextContent(
        `${label === "Candidates" ? 8 : 1}${label}${remedy}`,
      );
      expect(
        within(row).queryAllByRole("link", { name: "operator's page ›" }),
      ).toHaveLength(links);
    }
    expect(ledger.getAllByRole("list")).toHaveLength(7);
    expect(
      ledger.getByRole("listitem", { name: "Could not be reached" }),
    ).toHaveClass("ledger-row", "unr");
    expect(ledger.getByRole("listitem", { name: "Sold out" })).toHaveClass(
      "ledger-row",
    );
    expect(ledger.getByRole("listitem", { name: "Sold out" })).not.toHaveClass(
      "unr",
    );
    expect(
      ledger.getByText(
        "1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 to go = 8 · still reading",
      ),
    ).toBeVisible();
  });
});
