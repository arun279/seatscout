import type { Page } from "@playwright/test";
import { fakeUpstream } from "@seatscout/core/testing";

export const TONIGHT = "/?movie=245569&date=2026-08-28&area=75006&partySize=2";
export const HIT_AREA = 44;
export const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

export const answeredByTheCorpus = (page: Page) => {
  const upstream = fakeUpstream({ seed: 4, standInAuditoriums: true });
  return page.route("**/napi/**", async (route) => {
    const answer = await upstream(new URL(route.request().url()).pathname);
    await route.fulfill({
      status: answer.status,
      contentType: "application/json",
      body: await answer.text(),
    });
  });
};

export const hitAreasUnder = (page: Page, least: number) =>
  page.evaluate((floor) => {
    const grown = (element: Element, edge: "top" | "left") => {
      const after = getComputedStyle(element, "::after");
      if (after.content === "none" || after.position !== "absolute") return 0;
      return 2 * Math.abs(Number.parseFloat(after[edge]));
    };
    return [...document.querySelectorAll("button, a[href], input")]
      .filter((element) => element.closest("dialog:not([open])") === null)
      .map((element) => {
        const box = element.getBoundingClientRect();
        return {
          name: (
            element.getAttribute("aria-label") ??
            element.textContent ??
            ""
          )
            .trim()
            .slice(0, 32),
          width: box.width + grown(element, "left"),
          height: box.height + grown(element, "top"),
        };
      })
      .filter((area) => area.width < floor || area.height < floor);
  }, least);
