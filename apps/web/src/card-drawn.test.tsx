import "@testing-library/jest-dom/vitest";
import { readFile } from "node:fs/promises";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Card } from "./card.js";
import { labelOf } from "./phrases.js";
import { settledAlone } from "./search.fixtures.js";

const drawn = async <T,>(read: () => T): Promise<T> => {
  const sheet = document.createElement("style");
  sheet.textContent = await readFile("apps/web/src/results.css", "utf8");
  document.head.append(sheet);
  const found = read();
  sheet.remove();
  return found;
};

const afterRuleFor = (element: Element) => {
  const rules = [];
  for (const sheet of document.styleSheets) {
    for (const rule of sheet.cssRules) {
      if (!(rule instanceof CSSStyleRule)) continue;
      if (!rule.selectorText.endsWith("::after")) continue;
      const selector = rule.selectorText.slice(0, -"::after".length);
      if (!element.matches(selector)) continue;
      rules.push({
        content: rule.style.content,
        inset: rule.style.inset,
        position: rule.style.position,
      });
    }
  }
  return rules.at(-1) ?? null;
};

describe("the card, as the list's own stylesheet draws it", () => {
  afterEach(cleanup);

  it("draws the expanded seat hit area only on the button, not on the offline label", async () => {
    const settled = await settledAlone();
    const [first] = settled.results;
    if (first === undefined) throw new Error("no result to redraw");
    const card = (online: boolean) => (
      <ul>
        <Card
          result={first}
          now={0}
          online={online}
          onRoom={() => {}}
          onHandOff={() => {}}
        />
      </ul>
    );

    render(card(true));
    const button = screen.getByRole("button", {
      name: labelOf(first),
    });
    const reached = await drawn(() => afterRuleFor(button));

    cleanup();
    render(card(false));
    const label = document.querySelector(".card span.seats");
    if (!(label instanceof HTMLElement)) throw new Error("no offline label");
    const drawnLabel = await drawn(() => afterRuleFor(label));

    expect(reached).toEqual({
      content: '""',
      position: "absolute",
      inset: "-16px -10px",
    });
    expect(drawnLabel).toBeNull();
  });
});
