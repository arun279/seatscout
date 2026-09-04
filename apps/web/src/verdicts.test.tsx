import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  ask,
  before,
  cards,
  failing,
  LISTING,
  staged,
  TONIGHT,
} from "./app.fixtures.js";

describe("what the first screen says when the answer is not a list", () => {
  afterEach(cleanup);

  it("says a partial search is partial before it shows anything, and offers the retry before the wider query", async () => {
    const stage = staged({
      script: { sequences: failing([500, 500, 500]) },
    });
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
    const retry = screen.getByRole("button", { name: /retry/i });
    const widen = screen.getByRole("button", { name: /widen/i });
    expect(before(retry, widen)).toBe(true);
    expect(before(retry, cards()[0] ?? widen)).toBe(true);
  });

  it("retries with a fresh search and abandons the one before", async () => {
    const stage = staged({
      script: { sequences: failing([500, 500, 500]) },
    });
    await stage.settled();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(stage.searches).toHaveLength(2);
    expect(stage.aborted).toEqual([stage.searches[0]]);
  });

  it("opens the query at the Movie when the wider query is chosen over a retry", async () => {
    const stage = staged({
      script: { sequences: failing([500, 500, 500]) },
    });
    await stage.settled();
    fireEvent.click(screen.getByRole("button", { name: /widen/i }));

    expect(ask().getByLabelText("Movie number")).toHaveFocus();
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

  it("does not earn that no while rooms are unreached, and retries before it widens", async () => {
    const stage = staged({
      terms: { ...TONIGHT, partySize: 400 },
      script: { sequences: failing([500, 500, 500]) },
    });
    await stage.settled();

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Nothing yet, out of the 170 rooms that answered.",
    );
    expect(screen.queryByText(/anywhere today/)).toBeNull();
    const retry = screen.getByRole("button", { name: /retry/i });
    const widen = screen.getByRole("button", { name: /widen/i });
    expect(before(retry, widen)).toBe(true);
  });

  it("says the search itself failed when the listing cannot be read, counts nothing, and offers the retry first", async () => {
    const stage = staged({
      script: { sequences: { [LISTING]: [500, 500, 500] } },
    });
    await stage.settled();

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "The listing could not be read.",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Nothing was read");
    expect(screen.queryByRole("button", { name: /ledger/i })).toBeNull();
    const retry = screen.getByRole("button", { name: /retry/i });
    const widen = screen.getByRole("button", { name: /widen/i });
    expect(before(retry, widen)).toBe(true);
    expect(screen.queryByText(/candidates/)).toBeNull();
  });
});
