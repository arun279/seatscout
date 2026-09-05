import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { modal } from "./modal.js";
import { ask, cards, staged, TODAY, TONIGHT } from "./search.fixtures.js";
import type { Terms } from "./terms.js";

const NO_MOVIE: Terms = { date: TODAY, partySize: 2 };
const NO_AREA: Terms = { movie: "245569", date: TODAY, partySize: 2 };

const windowListeners = (calls: readonly unknown[][]) =>
  calls
    .filter(([type]) => type === "online" || type === "offline")
    .map(([type, listener]) => [type, listener]);

describe("the first screen", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens on the query as a title card and a prompt, with the Movie and the area waiting to be filled", () => {
    staged({ terms: NO_MOVIE });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Two seats together",
    );
    expect(screen.getByRole("button", { name: "Which movie?" })).toBeVisible();
    expect(document.querySelector("header")).toHaveTextContent(
      "Today · Near where? · Any format · Reference seat",
    );
    expect(
      screen.getByText(
        "Name a movie and an area to search. Two seats together, today and the Reference seat are already set.",
      ),
    ).toBeVisible();
    expect(cards()).toEqual([]);
  });

  it.each([
    ["the movie", NO_MOVIE, "Movie number"],
    ["the area", NO_AREA, "Near, by postal code"],
  ])(
    "asks first for what is missing when the prompt is pressed without %s",
    (_, terms, control) => {
      staged({ terms });
      fireEvent.click(screen.getByRole("button", { name: "Find seats" }));

      expect(ask().getByLabelText(control)).toHaveFocus();
      expect(ask().getByLabelText(control)).toHaveValue("");
    },
  );

  it("names the area once it has one", async () => {
    const stage = staged();
    await stage.settled();

    expect(document.querySelector("header")).toHaveTextContent(
      "Today · Near 75006 · Any format · Reference seat",
    );
  });

  it.each([
    [/two seats together/i, "More seats"],
    [/^245569$/, "Movie number"],
    [/^today$/i, "Date"],
    [/near 75006/i, "Near, by postal code"],
    [/reference seat/i, "How far back"],
  ])(
    "opens the query for editing from the title card's %s line, with that term ready to change",
    async (line, control) => {
      const stage = staged();
      await stage.settled();
      fireEvent.click(screen.getByRole("button", { name: line }));

      const editor = ask();
      expect(editor.getByLabelText("Movie number")).toHaveValue("245569");
      expect(editor.getByLabelText("Near, by postal code")).toHaveValue(
        "75006",
      );
      expect(editor.getByLabelText("Date")).toHaveValue(TODAY);
      expect(editor.getByText("2")).toBeVisible();
      expect(editor.getByLabelText(control)).toHaveFocus();
    },
  );

  it("keeps the query as it was on the way back, and closes", async () => {
    const stage = staged();
    await stage.settled();
    fireEvent.click(
      screen.getByRole("button", { name: /two seats together/i }),
    );
    fireEvent.click(ask().getByRole("button", { name: /keep as it was/i }));

    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
    expect(stage.chosen).toEqual([]);
  });

  it("runs the query as edited, with the party stepped and the Movie and area retyped, and closes", async () => {
    const stage = staged();
    await stage.settled();
    fireEvent.click(screen.getByRole("button", { name: /^245569$/ }));

    const editor = ask();
    fireEvent.click(editor.getByLabelText("More seats"));
    fireEvent.click(editor.getByLabelText("More seats"));
    fireEvent.click(editor.getByLabelText("Fewer seats"));
    fireEvent.change(editor.getByLabelText("Movie number"), {
      target: { value: "243819" },
    });
    fireEvent.change(editor.getByLabelText("Near, by postal code"), {
      target: { value: " 75234 " },
    });
    fireEvent.change(editor.getByLabelText("Date"), {
      target: { value: "2026-08-29" },
    });
    fireEvent.click(editor.getByRole("button", { name: /find seats/i }));

    expect(stage.chosen).toEqual([
      { movie: "243819", date: "2026-08-29", area: "75234", partySize: 3 },
    ]);
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
  });

  it("will not step the party below one", async () => {
    const stage = staged({ terms: { ...TONIGHT, partySize: 1 } });
    await stage.settled();
    fireEvent.click(screen.getByRole("button", { name: /one seat/i }));

    expect(ask().getByLabelText("Fewer seats")).toBeDisabled();
  });

  it("opens saying so when the device is already offline", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const stage = staged();
    await stage.settled();

    expect(screen.getByText(/^Offline\./)).toBeVisible();
  });

  it("says so when the device goes offline, and stops saying so when it is back", async () => {
    const onLine = vi.spyOn(navigator, "onLine", "get");
    const stage = staged();
    await stage.settled();

    onLine.mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByText(/^Offline\./)).toBeVisible();

    onLine.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.queryByText(/^Offline\./)).toBeNull();
  });

  it("listens to the window only while it is on the page", async () => {
    const added = vi.spyOn(window, "addEventListener");
    const removed = vi.spyOn(window, "removeEventListener");
    const stage = staged();
    await stage.settled();
    stage.unmount();

    expect(windowListeners(added.mock.calls)).toHaveLength(2);
    expect(windowListeners(removed.mock.calls)).toEqual(
      windowListeners(added.mock.calls),
    );
  });

  it("opens a modal as it reaches the page and closes it as it leaves", () => {
    const view = render(<dialog ref={modal} aria-label="a modal" />);
    const dialog = screen.getByRole("dialog", { name: "a modal" });

    expect(dialog).toBeVisible();

    view.unmount();

    expect(dialog).not.toHaveAttribute("open");
  });
});
