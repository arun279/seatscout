import { expect, type Page, test } from "@playwright/test";
import {
  answeredByTheCorpus,
  HIT_AREA,
  hitAreasUnder,
} from "./corpus.fixtures.js";

const planted = (page: Page, name: string, size: number, after: boolean) =>
  page.evaluate(
    ([label, side, grown]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(label);
      button.style.cssText = `width:${side}px;height:${side}px;padding:0;border:0;position:relative`;
      if (grown === true) {
        const rule = document.createElement("style");
        rule.textContent = `[data-planted="${label}"]::after{content:"";position:absolute;inset:-22px}`;
        document.head.append(rule);
      }
      button.dataset.planted = String(label);
      document.body.append(button);
    },
    [name, size, after] as const,
  );

test("reports a control smaller than the tap target, so a pass over one means it was measured", async ({
  page,
}) => {
  await answeredByTheCorpus(page);
  await page.goto("/");
  await planted(page, "too small", 20, false);

  expect(await hitAreasUnder(page, HIT_AREA)).toEqual([
    { name: "too small", width: 20, height: 20 },
  ]);
});

test("reports nothing for a control the tap target fits, drawn or reached through its own ::after", async ({
  page,
}) => {
  await answeredByTheCorpus(page);
  await page.goto("/");
  await planted(page, "wide enough", 44, false);
  await planted(page, "grown enough", 20, true);

  expect(await hitAreasUnder(page, HIT_AREA)).toEqual([]);
});
