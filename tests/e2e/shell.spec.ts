import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { shellFilesIn } from "../../apps/web/shell-files.js";

const SEAT_MAP = "/napi/seatMap/561478479";
const ROOM = '{"seats":[]}';
const REFUSED = "Not a request from this site";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const DIST = "apps/web/dist";

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

test("the service worker holds every script and stylesheet the build emitted, the page and what it carries, and nothing besides", async ({
  page,
}) => {
  const shell = await shellFilesIn(DIST);
  await controlled(page);

  expect(shell.filter((path) => path.endsWith(".js"))).not.toEqual([]);
  expect(shell.filter((path) => path.endsWith(".css"))).not.toEqual([]);
  expect(await cachedPaths(page)).toEqual(shell);
});

test("a seat map passes through the service worker to the network without being cached", async ({
  page,
}) => {
  await controlled(page);
  await page.route(`**${SEAT_MAP}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: ROOM,
    }),
  );

  const answers = await page.evaluate(async (path) => {
    const seatMap = await fetch(path);
    const unlisted = await fetch("/index.html");
    return [seatMap.status, await seatMap.text(), unlisted.status];
  }, SEAT_MAP);

  expect(answers).toEqual([200, ROOM, 200]);
  expect(await cachedPaths(page)).toEqual(await shellFilesIn(DIST));
});

test("the proxy admits what the shell's own script asks for and refuses the same address opened directly", async ({
  page,
}) => {
  await controlled(page);

  const asked = await page.evaluate(async (path) => {
    const answer = await fetch(path);
    return await answer.text();
  }, SEAT_MAP);
  const opened = await page.goto(SEAT_MAP);

  expect(asked).not.toContain(REFUSED);
  expect(opened?.status()).toBe(403);
  expect(await opened?.text()).toBe(REFUSED);
});

test("the shell loads with the network disabled", async ({ context, page }) => {
  await controlled(page);
  await context.setOffline(true);

  await page.reload();

  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS(
    "text-transform",
    "uppercase",
  );
  expect(
    await page.evaluate(() => navigator.serviceWorker.controller !== null),
  ).toBe(true);
});
