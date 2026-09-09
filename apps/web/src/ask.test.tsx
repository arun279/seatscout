import "@testing-library/jest-dom/vitest";
import { readFile } from "node:fs/promises";
import { REFERENCE } from "@seatscout/client";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  asking,
  chip,
  chipsIn,
  EVERYTHING,
  find,
  NOTHING_PLAYING,
  opened,
} from "./ask.fixtures.js";
import { Ask } from "./ask.js";
import { ask } from "./search.fixtures.js";

const TERMS = {
  movie: "245569",
  date: "2026-08-28",
  area: "75006",
  partySize: 2,
};

const rendered = () => {
  render(
    <Ask
      terms={TERMS}
      programme={NOTHING_PLAYING}
      onProgramme={() => NOTHING_PLAYING}
      profile={REFERENCE}
      recent={[]}
      today={TERMS.date}
      focus="profile"
      onClose={() => {}}
      onFind={() => {}}
    />,
  );
  return within(screen.getByRole("dialog", { name: /what are we seeing/i }));
};

const drawn = async <T,>(read: () => T): Promise<T> => {
  const sheet = document.createElement("style");
  sheet.textContent = await readFile("apps/web/public/ask.css", "utf8");
  document.head.append(sheet);
  const found = read();
  sheet.remove();
  return found;
};

describe("the Ask sheet, as the stylesheet it is served with draws it", () => {
  afterEach(cleanup);

  it("puts every control's name and what it says on one line, the value at the end of it", async () => {
    const editor = rendered();

    const rows = await drawn(() =>
      editor.getAllByRole("slider").map((slider) => {
        const top = slider.parentElement?.querySelector(".top");
        if (top === null || top === undefined)
          throw new Error("a control draws no name");
        const style = getComputedStyle(top);
        return {
          display: style.display,
          justifyContent: style.justifyContent,
          name: top.firstElementChild?.textContent,
          said: top.lastElementChild?.textContent,
        };
      }),
    );

    expect(rows).toStrictEqual(
      [
        ["How far back", "67% of the way back"],
        ["Left or right", "on the centreline"],
        ["Missing your spot", "Avoid"],
        ["Watching at an angle", "Avoid"],
        ["The front rows", "A little"],
        ["A wall, or the back row", "A little"],
        ["A console between seats", "A little"],
      ].map(([name, said]) => ({
        display: "flex",
        justifyContent: "space-between",
        name,
        said,
      })),
    );
  });

  it("spreads the words at both ends of every scale across one line, the weights' own included", async () => {
    rendered();

    const ends = await drawn(() =>
      [...document.querySelectorAll("dialog .ends")].map((row) => {
        const style = getComputedStyle(row);
        const words = [...row.children].map((word) => word.textContent);
        return `${style.display} ${style.justifyContent}: ${words.join(" / ")}`;
      }),
    );

    expect(ends).toStrictEqual([
      "flex space-between: Front row / Back row",
      "flex space-between: House left / House right",
      "flex space-between: Don't mind / Avoid",
    ]);
  });

  it("centres the line under the button that says nothing leaves the phone", async () => {
    const editor = rendered();

    const said = await drawn(
      () =>
        getComputedStyle(
          editor.getByText(
            "Preferences and history stay on this phone. No account exists.",
          ),
        ).textAlign,
    );

    expect(said).toBe("center");
  });
});

describe("the Ask sheet", () => {
  afterEach(cleanup);

  it("offers every Format and Comfort the closed sets hold, every Chain, and the Theaters near the area by name", async () => {
    await asking();

    expect(chipsIn("Format")).toHaveLength(15);
    expect(chipsIn("Comfort")).toHaveLength(4);
    expect(chipsIn("Chain")).toHaveLength(9);
    expect(chipsIn("Theater")).toHaveLength(25);
    expect(chipsIn("Theater")[0]).toHaveTextContent(
      "Cinemark Dallas XD and IMAX",
    );
    for (const pressed of chipsIn("Format"))
      expect(pressed).toHaveAttribute("aria-pressed", "false");
    for (const group of ["Format", "Comfort", "Chain", "Theater"])
      expect(
        chipsIn(group).filter((chip) => chip.hasAttribute("data-term")),
      ).toHaveLength(1);
  });

  it("composes every term in one search: format, comfort, chain, theater, a window and accessible seating", async () => {
    const stage = await asking();
    fireEvent.change(ask().getByLabelText("Film"), {
      target: { value: "245569" },
    });
    for (const name of [
      "IMAX",
      "Dolby Cinema",
      "Recliners",
      "Landmark",
      "AMC",
      "AMC Village on the Parkway 9",
      "Cinemark Dallas XD and IMAX",
    ])
      fireEvent.click(chip(name));
    fireEvent.change(ask().getByLabelText("From"), {
      target: { value: "19:00" },
    });
    fireEvent.change(ask().getByLabelText("Until"), {
      target: { value: "21:00" },
    });
    fireEvent.click(ask().getByLabelText("Accessible seating"));

    expect(chip("IMAX")).toHaveAttribute("aria-pressed", "true");
    expect(chip("3D")).toHaveAttribute("aria-pressed", "false");

    find();

    expect(stage.chosen).toEqual([EVERYTHING]);
  });

  it("shows every term it already holds when it opens, and lets one go", async () => {
    const stage = await opened({ terms: EVERYTHING });

    for (const name of [
      "IMAX",
      "Dolby Cinema",
      "Recliners",
      "AMC",
      "Landmark",
      "Cinemark Dallas XD and IMAX",
      "AMC Village on the Parkway 9",
    ])
      expect(chip(name)).toHaveAttribute("aria-pressed", "true");
    expect(ask().getByLabelText("From")).toHaveValue("19:00");
    expect(ask().getByLabelText("Until")).toHaveValue("21:00");
    expect(ask().getByLabelText("Accessible seating")).toBeChecked();

    fireEvent.click(chip("IMAX"));
    fireEvent.click(chip("AMC Village on the Parkway 9"));
    fireEvent.click(ask().getByLabelText("Accessible seating"));
    find();

    expect(stage.chosen).toEqual([
      {
        ...EVERYTHING,
        formats: ["Dolby Cinema"],
        theaters: ["aacbt"],
        accessibleSeating: undefined,
      },
    ]);
    expect(stage.chosen[0]).not.toHaveProperty("accessibleSeating");
  });

  it("explains accessible seating in the board's own words, and keeps the film list out of the way of a one-handed thumb", async () => {
    await asking();

    expect(
      ask().getByText(
        "Wheelchair and companion seats stay out of ordinary results. Turning this on searches for them deliberately.",
      ),
    ).toBeVisible();
    expect(ask().getByRole("button", { name: /find seats/i })).toBeVisible();
  });
});
