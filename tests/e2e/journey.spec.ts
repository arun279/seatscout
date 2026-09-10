import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { accessible, answeredByTheCorpus, TONIGHT } from "./corpus.fixtures.js";

const JOURNEYS = 10;
const SAMPLES = "reports/journey/samples.json";
const VITALS = join(
  dirname(createRequire(import.meta.url).resolve("web-vitals")),
  "web-vitals.iife.js",
);

const MID_TIER_PHONE = {
  viewport: { width: 412, height: 823 },
  deviceScaleFactor: 1.75,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36",
  serviceWorkers: "block",
} as const;

const bytesASecond = (kbps: number) => Math.round((kbps * 1024) / 8);
const SLOW_4G = {
  offline: false,
  latency: 150,
  downloadThroughput: bytesASecond(1.6 * 1024),
  uploadThroughput: bytesASecond(750),
};

const CONDITIONS = [
  `${MID_TIER_PHONE.viewport.width} by ${MID_TIER_PHONE.viewport.height} at ${MID_TIER_PHONE.deviceScaleFactor}x`,
  `${SLOW_4G.latency} ms round trip`,
  `${SLOW_4G.downloadThroughput} B/s down`,
  `${SLOW_4G.uploadThroughput} B/s up`,
].join(", ");

interface Journey {
  readonly firstSeatGroupsMs: number;
  readonly lcp: number;
  readonly inp: number;
  readonly cls: number;
  readonly heapBytes: number;
  readonly blockingMs: number;
  readonly longTasks: number;
  readonly conditions: string;
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
      blockingMs: number;
      longTasks: number;
    };
  }
}

const collector = () => {
  const LONG_TASK_MS = 50;
  window.journey = {
    ready: false,
    firstSeatGroupsMs: null,
    lcp: null,
    inp: null,
    cls: 0,
    blockingMs: 0,
    longTasks: 0,
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
  new PerformanceObserver((tasks) => {
    for (const task of tasks.getEntries()) {
      window.journey.longTasks += 1;
      window.journey.blockingMs += task.duration - LONG_TASK_MS;
    }
  }).observe({ type: "longtask", buffered: true });
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

const onASlowConnection = async (context: BrowserContext, page: Page) => {
  const devtools = await context.newCDPSession(page);
  await devtools.send("Network.enable");
  await devtools.send("Network.emulateNetworkConditions", SLOW_4G);
  await devtools.send("Performance.enable");
  await devtools.send("HeapProfiler.enable");
  return devtools;
};

const journey = async (context: BrowserContext): Promise<Journey> => {
  const page = await context.newPage();
  await answeredByTheCorpus(page);
  const devtools = await onASlowConnection(context, page);
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
  await page
    .getByRole("article")
    .first()
    .getByRole("button", { name: /in the room at/ })
    .click();
  await expect(page.getByRole("grid")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.waitForFunction(() => window.journey.inp !== null);
  const measured = await page.evaluate(() => window.journey);
  await devtools.send("HeapProfiler.collectGarbage");
  const { metrics } = await devtools.send("Performance.getMetrics");
  const heap = metrics.find((metric) => metric.name === "JSHeapUsedSize");
  if (
    !measured.ready ||
    measured.firstSeatGroupsMs === null ||
    measured.lcp === null ||
    measured.inp === null ||
    heap === undefined
  )
    throw new Error(
      `the journey measured nothing on some axis: ${JSON.stringify(measured)}`,
    );
  return {
    firstSeatGroupsMs: measured.firstSeatGroupsMs,
    lcp: measured.lcp,
    inp: measured.inp,
    cls: measured.cls,
    heapBytes: heap.value,
    blockingMs: measured.blockingMs,
    longTasks: measured.longTasks,
    conditions: CONDITIONS,
  };
};

test("a first search on a mid-tier phone over a slow connection puts Seat Groups on screen, measured on every axis the gate holds", {
  tag: "@performance",
}, async ({ browser }) => {
  const journeys: Journey[] = [];
  for (let run = 0; run < JOURNEYS; run += 1) {
    const context = await browser.newContext(MID_TIER_PHONE);
    journeys.push(await journey(context));
    await context.close();
  }
  mkdirSync("reports/journey", { recursive: true });
  writeFileSync(SAMPLES, JSON.stringify(journeys, null, 2));

  expect(JSON.parse(readFileSync(SAMPLES, "utf8"))).toEqual(
    Array.from({ length: JOURNEYS }, () => ({
      firstSeatGroupsMs: expect.any(Number),
      lcp: expect.any(Number),
      inp: expect.any(Number),
      cls: expect.any(Number),
      heapBytes: expect.any(Number),
      blockingMs: expect.any(Number),
      longTasks: expect.any(Number),
      conditions: CONDITIONS,
    })),
  );
});

test("the results screen and its ledger carry no WCAG 2.2 AA violation axe can detect, and every control reaches 44 px", {
  tag: "@accessibility",
}, async ({ page }) => {
  await answeredByTheCorpus(page);
  await page.goto(TONIGHT);
  await expect(page.getByRole("status")).toHaveText(/172 checked$/);

  await accessible(page);
  await page.getByRole("button", { name: "ledger" }).click();
  await expect(
    page.getByRole("dialog", { name: "Every showtime, accounted for." }),
  ).toBeVisible();
  await accessible(page);
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
