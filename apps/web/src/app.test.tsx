import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ask, cards, NEARBY, staged, TODAY, TONIGHT } from "./app.fixtures.js";
import { modal } from "./modal.js";
import { type Terms, termsFrom } from "./terms.js";

const NOTHING: Terms = { date: TODAY, partySize: 2 };
const NO_MOVIE: Terms = { date: TODAY, area: "75006", partySize: 2 };
const NO_AREA: Terms = { movie: "245569", date: TODAY, partySize: 2 };
const EVERYTHING = termsFrom(
  "?movie=245569&date=2026-08-28&area=75006&partySize=2&chain=AMC&chain=Landmark&theater=aacbt&theater=aaxju&format=Dolby+Cinema&format=IMAX&amenity=Recliners&from=19:00&until=21:00&accessibleSeating=true",
  TODAY,
);

const windowListeners = (calls: readonly unknown[][]) =>
  calls
    .filter(([type]) => type === "online" || type === "offline")
    .map(([type, listener]) => [type, listener]);

describe("the first screen", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens on the query as a title card and a prompt, with the area and the Movie waiting to be filled", () => {
    staged({ terms: NOTHING });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Two seats together",
    );
    expect(screen.getByRole("button", { name: "Which movie?" })).toBeVisible();
    expect(document.querySelector("header")).toHaveTextContent(
      "Today · Near where? · Any showtime · Reference seat",
    );
    expect(
      screen.getByText(
        "Name an area, then a movie playing near it. Two seats together, today and the Reference seat are already set.",
      ),
    ).toBeVisible();
    expect(cards()).toEqual([]);
  });

  it.each([
    ["anything", NOTHING, "Near, by postal code"],
    ["the area", NO_AREA, "Near, by postal code"],
    ["the movie", NO_MOVIE, "Film"],
  ])(
    "asks first for what is missing when the prompt is pressed without %s",
    (_, terms, control) => {
      staged({ terms });
      fireEvent.click(screen.getByRole("button", { name: "Find seats" }));

      expect(ask().getByLabelText(control)).toHaveFocus();
      expect(ask().getByLabelText(control)).toHaveValue("");
    },
  );

  it("names the area and the film once the programme near it is read", async () => {
    const stage = staged();
    await stage.programmed();

    expect(document.querySelector("header")).toHaveTextContent(
      "Today · Near 75006 · Any showtime · Reference seat",
    );
    expect(
      screen.getByRole("button", { name: "The Dog Stars (2026)" }),
    ).toBeVisible();
  });

  it("shows the film's identity until the programme names it, and keeps it when the programme cannot be read", async () => {
    const stage = staged({
      script: { sequences: { [NEARBY]: [500, 500, 500] } },
    });

    expect(screen.getByRole("button", { name: "245569" })).toBeVisible();

    await stage.programmed();

    expect(screen.getByRole("button", { name: "245569" })).toBeVisible();
  });

  it("states every term on the card, each a line that opens the sheet at that term", async () => {
    const stage = staged({ terms: EVERYTHING });
    await stage.programmed();

    expect(document.querySelector("header")).toHaveTextContent(
      "Today · 7:00p to 9:00p · Near 75006 · Dolby Cinema or IMAX · Recliners · AMC or Landmark · Cinemark Dallas XD and IMAX or AMC Village on the Parkway 9 · Accessible seating · Reference seat",
    );
    for (const [line, control] of [
      [/7:00p to 9:00p/i, () => ask().getByLabelText("From")],
      [
        /dolby cinema or imax/i,
        () => ask().getByRole("button", { name: "3D" }),
      ],
      [
        /^recliners$/i,
        () => ask().getByRole("button", { name: "Accessibility Devices" }),
      ],
      [/amc or landmark/i, () => ask().getByRole("button", { name: "AMC" })],
      [
        /cinemark dallas xd and imax or/i,
        () =>
          ask().getByRole("button", { name: "Cinemark Dallas XD and IMAX" }),
      ],
      [/accessible seating/i, () => ask().getByLabelText("Accessible seating")],
    ] as const) {
      fireEvent.click(screen.getByRole("button", { name: line }));
      expect(control()).toHaveFocus();
      fireEvent.click(ask().getByRole("button", { name: /keep as it was/i }));
    }
  });

  it.each([
    [/two seats together/i, "More seats"],
    [/the dog stars/i, "Film"],
    [/^today$/i, "Date"],
    [/near 75006/i, "Near, by postal code"],
  ])(
    "opens the query for editing from the title card's %s line, with that term ready to change",
    async (line, control) => {
      const stage = staged();
      await stage.programmed();
      fireEvent.click(screen.getByRole("button", { name: line }));

      const editor = ask();
      expect(editor.getByLabelText("Film")).toHaveValue("The Dog Stars (2026)");
      expect(editor.getByLabelText("Near, by postal code")).toHaveValue(
        "75006",
      );
      expect(editor.getByLabelText("Date")).toHaveValue(TODAY);
      expect(editor.getByText("2")).toBeVisible();
      expect(editor.getByLabelText(control)).toHaveFocus();
    },
  );

  it("opens the sheet at the Formats from the line that says any showtime", async () => {
    const stage = staged();
    await stage.programmed();
    fireEvent.click(screen.getByRole("button", { name: /any showtime/i }));

    expect(ask().getByRole("button", { name: "3D" })).toHaveFocus();
  });

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

  it("runs the query as edited, with the party stepped and the film's number and the area retyped, and closes", async () => {
    const stage = staged();
    await stage.programmed();
    fireEvent.click(screen.getByRole("button", { name: /the dog stars/i }));

    const editor = ask();
    fireEvent.click(editor.getByLabelText("More seats"));
    fireEvent.click(editor.getByLabelText("More seats"));
    fireEvent.click(editor.getByLabelText("Fewer seats"));
    fireEvent.change(editor.getByLabelText("Film"), {
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
