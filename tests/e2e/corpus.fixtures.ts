import { AxeBuilder } from "@axe-core/playwright";
import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { fakeUpstream } from "@seatscout/core/testing";
import type { FakeUpstream, UpstreamScript } from "@seatscout/core/testing";

export const TONIGHT = "/?movie=245569&date=2026-08-28&area=75006&partySize=2";
export const HIT_AREA = 44;
export const WCAG: string[] = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
];
export const SEAT_MAP = "/napi/seatMap/";

export const answeredByTheCorpus = async (
  page: Page,
  script: Omit<UpstreamScript, "seed"> = {},
): Promise<FakeUpstream> => {
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
): number =>
  upstream.requests.filter((request) => request.path.startsWith(prefix)).length;

export const hitAreasUnder = (
  page: Page,
  least: number,
): Promise<readonly { width: number; height: number; name: string }[]> =>
  page.evaluate((floor) => {
    const containing = (element: Element): Element => {
      for (let at: Element | null = element; at !== null; at = at.parentElement)
        if (getComputedStyle(at).position !== "static") return at;
      return document.documentElement;
    };
    const reach = (element: Element) => {
      const own = element.getBoundingClientRect();
      const drawn = { width: own.width, height: own.height };
      const after = getComputedStyle(element, "::after");
      if (after.content === "none" || after.position !== "absolute")
        return drawn;
      const edges = [after.top, after.right, after.bottom, after.left].map(
        Number.parseFloat,
      );
      if (!edges.every(Number.isFinite)) return drawn;
      const [top = 0, right = 0, bottom = 0, left = 0] = edges;
      const base = containing(element).getBoundingClientRect();
      return {
        width: Math.max(drawn.width, base.width - left - right),
        height: Math.max(drawn.height, base.height - top - bottom),
      };
    };
    return [
      ...document.querySelectorAll(
        "button, a[href], input:not([type=checkbox], [type=radio]), label:has(> input:is([type=checkbox], [type=radio]))",
      ),
    ]
      .filter((element) => element.closest("dialog:not([open])") === null)
      .map((element) => ({
        name: (element.getAttribute("aria-label") ?? element.textContent ?? "")
          .trim()
          .slice(0, 32),
        ...reach(element),
      }))
      .filter((area) => area.width < floor || area.height < floor);
  }, least);

export const clippedFieldsIn = (
  page: Page,
): Promise<
  readonly {
    name: string | null;
    drawn: number;
    needed: number;
  }[]
> =>
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

const tapsAnsweredElsewhere = (page: Page) =>
  page.evaluate(() => {
    const open = [...document.querySelectorAll("dialog[open]")];
    const within = open.at(-1) ?? document.documentElement;
    const named = (element: Element) =>
      (element.getAttribute("aria-label") ?? element.textContent ?? "")
        .trim()
        .slice(0, 32);
    const resting = {
      top: within.scrollTop,
      left: within.scrollLeft,
      x: window.scrollX,
      y: window.scrollY,
    };
    const misses = [...within.querySelectorAll("button, a[href], input")]
      .map((element) => {
        element.scrollIntoView({ block: "center" });
        const box = element.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) return null;
        const answered = document.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2,
        );
        return answered === null || element.contains(answered)
          ? null
          : { asked: named(element), answered: named(answered) };
      })
      .filter((miss) => miss !== null);
    within.scrollTop = resting.top;
    within.scrollLeft = resting.left;
    window.scrollTo(resting.x, resting.y);
    return misses;
  });

export const accessible = async (page: Page): Promise<void> => {
  const scan = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(scan.violations).toEqual([]);
  expect(await hitAreasUnder(page, HIT_AREA)).toEqual([]);
  expect(await tapsAnsweredElsewhere(page)).toEqual([]);
};
