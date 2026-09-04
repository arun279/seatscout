import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import {
  answeredByTheCorpus,
  HIT_AREA,
  hitAreasUnder,
  TONIGHT,
  WCAG,
} from "./corpus.fixtures.js";

const JOURNEYS = 10;
const SAMPLES = "reports/journey/samples.json";
const GOOD = { lcp: 2500, inp: 200, cls: 0.1 };
const VITALS = join(
  dirname(createRequire(import.meta.url).resolve("web-vitals")),
  "web-vitals.iife.js",
);

interface Journey {
  readonly firstSeatGroupsMs: number;
  readonly lcp: number;
  readonly inp: number;
  readonly cls: number;
}

declare const webVitals: {
  onLCP: (report: (metric: { value: number }) => void, options: object) => void;
  onINP: (report: (metric: { value: number }) => void, options: object) => void;
};

declare global {
  interface Window {
    journey: {
      ready: boolean;
      firstSeatGroupsMs: number | null;
      lcp: number | null;
      inp: number | null;
      cls: number;
    };
  }
}

const p75 = (values: readonly number[]) =>
  values.toSorted((a, b) => a - b)[Math.ceil(values.length * 0.75) - 1] ?? 0;

const collector = () => {
  window.journey = {
    ready: false,
    firstSeatGroupsMs: null,
    lcp: null,
    inp: null,
    cls: 0,
  };
  const all = { reportAllChanges: true };
  webVitals.onLCP((metric) => {
    window.journey.lcp = metric.value;
  }, all);
  webVitals.onINP((metric) => {
    window.journey.inp = metric.value;
  }, all);
  new PerformanceObserver((shifts) => {
    for (const shift of shifts.getEntries())
      if (!("hadRecentInput" in shift && shift.hadRecentInput))
        window.journey.cls += "value" in shift ? Number(shift.value) : 0;
  }).observe({ type: "layout-shift", buffered: true });
  new MutationObserver((_, observer) => {
    if (document.querySelector("article") === null) return;
    observer.disconnect();
    requestAnimationFrame(() => {
      window.journey.firstSeatGroupsMs = performance.now();
    });
  }).observe(document, { childList: true, subtree: true });
  window.journey.ready = true;
};

const instrumented = (page: Page) =>
  page.addInitScript({
    content: `${readFileSync(VITALS, "utf8")}\n(${collector.toString()})();`,
  });

const journey = async (page: Page): Promise<Journey> => {
  await answeredByTheCorpus(page);
  await instrumented(page);
  await page.goto(TONIGHT);
  await expect(page.getByRole("article").first()).toBeVisible();
  await expect(page.getByRole("status")).toHaveText(
    /176 candidates · 172 checked$/,
  );
  await page.getByRole("button", { name: "ledger" }).click();
  await expect(
    page.getByRole("dialog", { name: "Every showtime, accounted for." }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.waitForFunction(() => window.journey.inp !== null);
  const measured = await page.evaluate(() => window.journey);
  if (
    !measured.ready ||
    measured.firstSeatGroupsMs === null ||
    measured.lcp === null ||
    measured.inp === null
  )
    throw new Error(
      `the journey measured nothing on some axis: ${JSON.stringify(measured)}`,
    );
  return {
    firstSeatGroupsMs: measured.firstSeatGroupsMs,
    lcp: measured.lcp,
    inp: measured.inp,
    cls: measured.cls,
  };
};

test.use({ serviceWorkers: "block" });

test(
  "a first search puts Seat Groups on screen, measured, and the journey meets the Core Web Vitals good thresholds",
  { tag: "@performance" },
  async ({ browser }, info) => {
    const journeys: Journey[] = [];
    for (let run = 0; run < JOURNEYS; run += 1) {
      const context = await browser.newContext();
      journeys.push(await journey(await context.newPage()));
      await context.close();
    }
    mkdirSync("reports/journey", { recursive: true });
    writeFileSync(SAMPLES, JSON.stringify(journeys, null, 2));

    info.annotations.push({
      type: "first Seat Groups, p75 ms",
      description: `${p75(journeys.map((run) => run.firstSeatGroupsMs)).toFixed(0)}`,
    });
    info.annotations.push({
      type: "p75 LCP ms, INP ms, CLS",
      description: `${p75(journeys.map((run) => run.lcp)).toFixed(0)}, ${p75(journeys.map((run) => run.inp)).toFixed(0)}, ${p75(journeys.map((run) => run.cls)).toFixed(3)}`,
    });

    expect(journeys).toHaveLength(JOURNEYS);
    expect(p75(journeys.map((run) => run.lcp))).toBeLessThan(GOOD.lcp);
    expect(p75(journeys.map((run) => run.inp))).toBeLessThan(GOOD.inp);
    expect(p75(journeys.map((run) => run.cls))).toBeLessThan(GOOD.cls);
  },
);

test("the results screen and its ledger carry no WCAG 2.2 AA violation axe can detect, and every control reaches 44 px", {
  tag: "@accessibility",
}, async ({ page }) => {
  await answeredByTheCorpus(page);
  await page.goto(TONIGHT);
  await expect(page.getByRole("status")).toHaveText(/172 checked$/);

  const scan = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const onTheList = await hitAreasUnder(page, HIT_AREA);
  await page.getByRole("button", { name: "ledger" }).click();
  await expect(
    page.getByRole("dialog", { name: "Every showtime, accounted for." }),
  ).toBeVisible();
  const inTheLedger = await hitAreasUnder(page, HIT_AREA);

  expect(scan.violations).toEqual([]);
  expect(onTheList).toEqual([]);
  expect(inTheLedger).toEqual([]);
});

test("a tap on a line of the title card opens the editor with that term focused, and Escape keeps the query", {
  tag: "@accessibility",
}, async ({ page }) => {
  await answeredByTheCorpus(page);
  await page.goto(TONIGHT);
  await expect(page.getByRole("status")).toHaveText(/172 checked$/);

  await page.getByRole("button", { name: "Near 75006" }).click();
  await expect(page.getByLabel("Near, by postal code")).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(new URL(page.url()).search).toBe(TONIGHT.slice(1));
});
