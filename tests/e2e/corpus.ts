import type { Page } from "@playwright/test";
import { fakeUpstream, type UpstreamScript } from "@seatscout/core/testing";

export const TONIGHT = "/?movie=245569&date=2026-08-28&area=75006&partySize=2";

export const answeredByTheCorpus = async (
  page: Page,
  script: Omit<UpstreamScript, "seed"> = {},
) => {
  const upstream = fakeUpstream({
    seed: 4,
    standInAuditoriums: true,
    standInTheaters: true,
    ...script,
  });
  await page.route("**/napi/**", async (route) => {
    const answer = await upstream(new URL(route.request().url()).pathname);
    await route.fulfill({
      status: answer.status,
      contentType: "application/json",
      body: await answer.text(),
    });
  });
  return {
    requested: (prefix: string) =>
      upstream.requests.filter((request) => request.path.startsWith(prefix))
        .length,
  };
};

export const hitAreasUnder = (page: Page, least: number) =>
  page.evaluate((floor) => {
    const grown = (element: Element, edge: "top" | "left") => {
      const after = getComputedStyle(element, "::after");
      if (after.content === "none" || after.position !== "absolute") return 0;
      return 2 * Math.abs(Number.parseFloat(after[edge]));
    };
    return [
      ...document.querySelectorAll(
        "button, a[href], input:not([type=checkbox]), label:has(> input[type=checkbox])",
      ),
    ]
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
