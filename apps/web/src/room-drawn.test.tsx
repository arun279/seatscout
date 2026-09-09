import "@testing-library/jest-dom/vitest";
import { readFile } from "node:fs/promises";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { opened } from "./auditorium.fixtures.js";
import { WEST_PLANO_28 } from "./rooms.fixtures.js";

const PUBLIC = "apps/web/public";
const SHEET = /<link rel="stylesheet" href="([^"]*)"/g;

let sheets: readonly string[] = [];

const served = () => {
  const styles = sheets.map((css) => {
    const sheet = document.createElement("style");
    sheet.textContent = css;
    document.head.append(sheet);
    return sheet;
  });
  return () => {
    for (const sheet of styles) sheet.remove();
  };
};

const drawn = (element: Element) => getComputedStyle(element);

beforeAll(async () => {
  const html = await readFile(`${PUBLIC}/index.html`, "utf8");
  sheets = await Promise.all(
    [...html.matchAll(SHEET)].map(([, href]) =>
      readFile(`${PUBLIC}${href}`, "utf8"),
    ),
  );
});

describe("the room, as the stylesheets it is served with draw it", () => {
  afterEach(cleanup);

  it("takes no rule from the Ask sheet or the hand-off sheet, which name three of its classes", async () => {
    const stage = await opened(WEST_PLANO_28);
    const off = served();
    const room = drawn(stage.dialog);
    const swatch = stage.dialog.querySelector(".legend i");
    const chip = stage.dialog.querySelector(".chip");
    const legend = stage.dialog.querySelector(".legend");
    if (swatch === null || chip === null || legend === null)
      throw new Error("the room draws no legend or no chip");
    const marks = drawn(swatch);
    const chosen = drawn(chip);
    const list = drawn(legend);
    off();

    expect(room.cursor).toBe("auto");
    expect(room.borderRadius).toBe("");
    expect(marks.width).toBe("9px");
    expect(marks.marginRight).toBe("0");
    expect(list.justifyContent).toBe("normal");
    expect(list.padding).toBe("9px 2px 0px");
    expect(chosen.minHeight).toBe("44px");
    expect(chosen.alignSelf).toBe("auto");
  });
});
