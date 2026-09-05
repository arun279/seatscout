import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const SEAT_MAP = "/napi/seatMap/561478479";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const SHELL = [
  "/",
  "/app.css",
  "/ask.css",
  "/coverage.css",
  "/fonts/big-shoulders-display.woff2",
  "/fonts/schibsted-grotesk.woff2",
  "/fonts/spline-sans-mono.woff2",
  "/house.css",
  "/icon.svg",
  "/index.js",
  "/manifest.webmanifest",
  "/query.css",
  "/results.css",
];

const cachedPaths = (page: Page) =>
  page.evaluate(async () => {
    const names = await caches.keys();
    const held = await Promise.all(
      names.map(async (name) =>
        (await (await caches.open(name)).keys()).map(
          (request) => new URL(request.url).pathname,
        ),
      ),
    );
    return held.flat().sort();
  });

const controlled = async (page: Page) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  expect(
    await page.evaluate(() => navigator.serviceWorker.controller !== null),
  ).toBe(true);
};

test("the root serves the shell page", async ({ page }) => {
  const answer = await page.goto("/");

  expect(answer?.status()).toBe(200);
  await expect(page).toHaveTitle("SeatScout");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Two seats together",
  );
});

test("the shell carries no violation of WCAG 2.2 at level AA that axe can detect", {
  tag: "@accessibility",
}, async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  const scan = await new AxeBuilder({ page }).withTags(WCAG).analyze();

  expect(scan.violations).toEqual([]);
});

test("the service worker holds the shell and nothing besides", async ({
  page,
}) => {
  await controlled(page);

  expect(await cachedPaths(page)).toEqual(SHELL);
});

test("a seat map passes through the service worker to the proxy without being cached", async ({
  page,
}) => {
  await controlled(page);

  const answers = await page.evaluate(async (path) => {
    const seatMap = await fetch(path);
    const unlisted = await fetch("/index.html");
    return [seatMap.status, await seatMap.text(), unlisted.status];
  }, SEAT_MAP);

  expect(answers).toEqual([500, "The proxy is not configured", 200]);
  expect(await cachedPaths(page)).toEqual(SHELL);
});

test("the shell loads with the network disabled", async ({ context, page }) => {
  await controlled(page);
  await context.setOffline(true);

  await page.reload();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Two seats together",
  );
  expect(
    await page.evaluate(() => navigator.serviceWorker.controller !== null),
  ).toBe(true);
});
