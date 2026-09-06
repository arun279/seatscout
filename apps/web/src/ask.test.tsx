import "@testing-library/jest-dom/vitest";
import { readFile } from "node:fs/promises";
import { REFERENCE } from "@seatscout/client";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Ask } from "./ask.js";

const TERMS = {
  movie: "245569",
  date: "2026-08-28",
  area: "75006",
  partySize: 2,
};

const opened = () => {
  render(
    <Ask
      terms={TERMS}
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
    const editor = opened();

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
    opened();

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
    const editor = opened();

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
