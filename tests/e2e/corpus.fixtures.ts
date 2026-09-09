import type { Page } from "@playwright/test";
import { fakeUpstream, type UpstreamScript } from "@seatscout/core/testing";

export const TONIGHT = "/?movie=245569&date=2026-08-28&area=75006&partySize=2";
export const HIT_AREA = 44;
export const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
export const SEAT_MAP = "/napi/seatMap/";

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
  return upstream;
};

export const requestsTo = (
  upstream: ReturnType<typeof fakeUpstream>,
  prefix: string,
) =>
  upstream.requests.filter((request) => request.path.startsWith(prefix)).length;

export const hitAreasUnder = (page: Page, least: number) =>
  page.evaluate((floor) => {
    const areaOf = (element: Element) => {
      const box = element.getBoundingClientRect();
      const after = getComputedStyle(element, "::after");
      if (after.content === "none" || after.position !== "absolute") return box;
      return {
        width: Math.max(box.width, Number.parseFloat(after.width)),
        height: Math.max(box.height, Number.parseFloat(after.height)),
      };
    };
    return [
      ...document.querySelectorAll(
        "button, a[href], input:not([type=checkbox]), label:has(> input[type=checkbox])",
      ),
    ]
      .filter((element) => element.closest("dialog:not([open])") === null)
      .map((element) => {
        const area = areaOf(element);
        return {
          name: (
            element.getAttribute("aria-label") ??
            element.textContent ??
            ""
          )
            .trim()
            .slice(0, 32),
          width: area.width,
          height: area.height,
        };
      })
      .filter((area) => area.width < floor || area.height < floor);
  }, least);

export const clippedFieldsIn = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("dialog[open] input, main input")]
      .map((field) => {
        const drawn = field.getBoundingClientRect().width;
        const style = field.getAttribute("style");
        field.setAttribute("style", `${style ?? ""};width:max-content`);
        const needed = field.getBoundingClientRect().width;
        if (style === null) field.removeAttribute("style");
        else field.setAttribute("style", style);
        return {
          name: field.getAttribute("aria-label") ?? field.getAttribute("type"),
          drawn,
          needed,
        };
      })
      .filter((field) => field.drawn + 0.5 < field.needed),
  );
