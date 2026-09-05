import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { opened } from "./auditorium.fixtures.js";
import {
  STRIKE_AND_REEL_1,
  VILLAGE_1,
  WEST_PLANO_28,
} from "./rooms.fixtures.js";

const nameOf = (element: Element) => element.getAttribute("aria-label");

const settledDom = () => act(() => Promise.resolve());

describe("the row bar, which is the row a screen reader hears and everyone else sees", () => {
  afterEach(cleanup);

  it("speaks the row on a row change from a status region and stays silent through a horizontal sweep", async () => {
    const stage = await opened(WEST_PLANO_28);
    const bar = stage.rowBar();
    const changes: MutationRecord[] = [];
    new MutationObserver((records) => changes.push(...records)).observe(bar, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    expect(bar).toHaveAttribute("role", "status");
    expect(bar).toHaveTextContent(
      "ROW H8th row of 14 from the front. 20 seats, 12 bookable.",
    );

    stage.press("ArrowRight");
    stage.press("ArrowRight");
    stage.press("Home");
    await settledDom();
    expect(changes).toEqual([]);

    stage.press("ArrowDown");
    await settledDom();
    expect(changes.length).toBeGreaterThan(0);
    expect(stage.rowBar()).toBe(bar);
    expect(bar).toHaveTextContent(
      "ROW J9th row of 14 from the front. 18 seats, 1 bookable.",
    );
  });

  it("leaves the row chip off a row that agrees on no label, and still names its ordinal", async () => {
    const stage = await opened(VILLAGE_1);
    stage.press("ArrowUp");
    stage.press("ArrowUp");

    expect(stage.rowBar()).toHaveTextContent(
      "5th row of 10 from the front. 23 seats, 21 bookable, 11 of them wheelchair or companion spaces.",
    );
    expect(stage.rowBar().textContent?.startsWith("ROW")).toBe(false);
  });

  it("returns focus to the current Seat when the row bar is pressed, and the bar shows the row again after a refusal", async () => {
    const stage = await opened(STRIKE_AND_REEL_1);
    stage.press("Home");
    stage.press("Enter");
    act(() => stage.room.getByRole("radio", { name: /^D8·D7/ }).focus());

    expect(stage.rowBar()).toHaveTextContent("Seat D11 is not bookable");
    expect(stage.focused()).toHaveAttribute("type", "radio");

    fireEvent.click(
      stage.room.getByRole("button", { name: /Seat D11 is not bookable/ }),
    );

    expect(nameOf(stage.focused())).toMatch(/^Seat D11\. /);
    expect(stage.rowBar()).toHaveTextContent(
      "ROW D4th row of 5 from the front. 10 seats, 4 bookable.",
    );
  });
});
