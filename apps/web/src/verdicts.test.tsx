import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  ask,
  before,
  cards,
  failing,
  LISTING,
  SEAT_MAP,
  staged,
  TONIGHT,
} from "./app.fixtures.js";

const REFUSED_THREE_TIMES = failing([500, 500, 500]);

describe("what the first screen says when the answer is not a list", () => {
  afterEach(cleanup);

  it("says a partial search is partial before it shows anything, and offers the retry before the wider query", async () => {
    const stage = staged({ script: { sequences: REFUSED_THREE_TIMES } });
    await stage.settled();

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Not everywhere yet.",
    );
    expect(screen.getByText("unreached").closest("p")).toHaveTextContent(
      /176\s*candidates\s*170\s*answered\s*2\s*unreached/,
    );
    expect(screen.getByText("From the 170 rooms that answered")).toBeVisible();
    expect(screen.getByText("AMC Stonebriar 24 · 4:20p")).toBeVisible();
    expect(screen.getByText("AMC Stonebriar 24 · 6:00p")).toBeVisible();
    const retry = screen.getByRole("button", {
      name: "Retry the two unreached",
    });
    const widen = screen.getByRole("button", { name: /widen/i });
    expect(before(retry, widen)).toBe(true);
    expect(before(retry, cards()[0] ?? widen)).toBe(true);
  });

  it("re-checks only the two unreached, reading no listing and no other room, and Coverage says so once they answer", async () => {
    const stage = staged({ script: { sequences: REFUSED_THREE_TIMES } });
    await stage.settled();
    const seatMaps = stage.requested(SEAT_MAP);
    const listings = stage.requested(LISTING);
    fireEvent.click(screen.getByRole("button", { name: /retry the two/i }));
    await stage.settled();

    expect(stage.requested(SEAT_MAP) - seatMaps).toBe(2);
    expect(stage.requested(LISTING)).toBe(listings);
    expect(stage.searches).toHaveLength(1);
    expect(stage.aborted).toEqual([]);
    expect(screen.getByRole("status")).toHaveTextContent(
      /^176 candidates · 172 checked$/,
    );
    expect(screen.queryByText("Not everywhere yet.")).toBeNull();
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "The top of the list is a tie",
    );
  });

  it("keeps the rooms that answered on screen while the unreached are retried", async () => {
    const stage = staged({
      script: { sequences: failing([500, 500, 500, 500]) },
      holdRetries: true,
    });
    const twoHeld = () => expect(stage.heldRetries()).toBe(2);
    await waitFor(twoHeld);
    await stage.resumeRetries();
    await waitFor(twoHeld);
    await stage.resumeRetries();
    await stage.settled();
    const shown = cards().length;
    fireEvent.click(screen.getByRole("button", { name: /retry the two/i }));
    await waitFor(twoHeld);

    expect(shown).toBeGreaterThan(0);
    expect(cards()).toHaveLength(shown);
    expect(screen.getByText("Reading 2 seat maps")).toBeVisible();
    expect(screen.queryByText("Not everywhere yet.")).toBeNull();

    await stage.resumeRetries();
    await stage.settled();

    expect(cards().length).toBeGreaterThan(shown);
    expect(screen.getByRole("status")).toHaveTextContent(
      /^176 candidates · 172 checked$/,
    );
  });

  it("opens the query at the film when the wider query is chosen over a retry", async () => {
    const stage = staged({ script: { sequences: REFUSED_THREE_TIMES } });
    await stage.settled();
    fireEvent.click(screen.getByRole("button", { name: /widen/i }));

    expect(ask().getByLabelText("Film")).toHaveFocus();
  });

  it("earns a no only once every candidate has answered, and opens the query at the party from it", async () => {
    const stage = staged({ terms: { ...TONIGHT, partySize: 400 } });
    await stage.settled();

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "No 400 seats together, anywhere today.",
    );
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
    expect(
      screen.getByText(
        "Fewer seats together, another day or a wider area would change it.",
      ),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /change the query/i }));

    expect(ask().getByLabelText("More seats")).toHaveFocus();
  });

  it("says no Showtime matched when the terms narrowed the listing to nothing, and does not claim anywhere", async () => {
    const stage = staged({
      terms: { ...TONIGHT, theaters: ["nowhere"] },
    });
    await stage.settled();

    expect(screen.getByRole("status")).toHaveTextContent(
      /^0 candidates · 0 checked$/,
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "No showtime matches this query today.",
    );
    expect(screen.queryByText(/anywhere/)).toBeNull();
    expect(
      screen.getByText(
        "Nothing listed near 75006 carries every term at once, so nothing was checked. Fewer terms would change it.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /change the query/i }));

    expect(ask().getByRole("button", { name: "3D" })).toHaveFocus();
  });

  it("does not earn that no while rooms are unreached, and retries before it widens", async () => {
    const stage = staged({
      terms: { ...TONIGHT, partySize: 400 },
      script: { sequences: REFUSED_THREE_TIMES },
    });
    await stage.settled();

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Nothing yet, out of the 170 rooms that answered.",
    );
    expect(screen.queryByText(/anywhere today/)).toBeNull();
    const retry = screen.getByRole("button", { name: /retry the two/i });
    const widen = screen.getByRole("button", { name: /widen/i });
    expect(before(retry, widen)).toBe(true);
  });

  it("says the search itself failed when the listing cannot be read, counts nothing, offers the retry first, and re-reads the listing on it", async () => {
    const stage = staged({
      script: { sequences: { [LISTING]: [500, 500, 500] } },
    });
    await stage.settled();

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "The listing could not be read.",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Nothing was read");
    expect(screen.queryByRole("button", { name: /ledger/i })).toBeNull();
    const retry = screen.getByRole("button", { name: "Retry the search" });
    const widen = screen.getByRole("button", { name: /widen/i });
    expect(before(retry, widen)).toBe(true);
    expect(screen.queryByText(/candidates/)).toBeNull();

    fireEvent.click(retry);
    await stage.settled();

    expect(stage.searches).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent(
      /^176 candidates · 172 checked$/,
    );
  });
});
