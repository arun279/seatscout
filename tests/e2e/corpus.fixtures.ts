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
    const containing = (element: Element): Element => {
      for (let at: Element | null = element; at !== null; at = at.parentElement)
        if (getComputedStyle(at).position !== "static") return at;
      return document.documentElement;
    };
    const reach = (element: Element) => {
      const own = element.getBoundingClientRect();
      const after = getComputedStyle(element, "::after");
      if (after.content === "none" || after.position !== "absolute") return own;
      const edges = [after.top, after.right, after.bottom, after.left].map(
        Number.parseFloat,
      );
      if (!edges.every(Number.isFinite)) return own;
      const [top = 0, right = 0, bottom = 0, left = 0] = edges;
      const base = containing(element).getBoundingClientRect();
      return {
        width: Math.max(own.width, base.width - left - right),
        height: Math.max(own.height, base.height - top - bottom),
      };
    };
    return [...document.querySelectorAll("button, a[href], input")]
      .filter((element) => element.closest("dialog:not([open])") === null)
      .map((element) => ({
        name: (element.getAttribute("aria-label") ?? element.textContent ?? "")
          .trim()
          .slice(0, 32),
        ...reach(element),
      }))
      .filter((area) => area.width < floor || area.height < floor);
  }, least);
