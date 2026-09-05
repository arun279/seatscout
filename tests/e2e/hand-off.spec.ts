import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import {
  answeredByTheCorpus,
  HIT_AREA,
  hitAreasUnder,
  SEAT_MAP,
  TONIGHT,
  WCAG,
} from "./corpus.fixtures.js";

const TICKETING = "**/transaction/ticketing/**";
const HOOKY = "Hooky Entertainment Addison + SDX";
const HOOKY_TICKETING =
  "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2026-08-28%2B09%3A00&from=mov_det_showtimes&source=desktop&mid=245569&tid=aawza&dfam=webbrowser&showtimehashcode=v2-d2998da8682c402f6a3d3b08e2e04eebbebc86096e8467e63cc506ab808dec5a";

const addison = (page: Page) =>
  page
    .getByRole("article", { name: `${HOOKY}, 9:00a, SDX` })
    .getByRole("button", { name: "G6·G7" });

const opened = async (page: Page) => {
  const upstream = await answeredByTheCorpus(page);
  const order: string[] = [];
  await page.route(`**${SEAT_MAP}**`, (route) => {
    order.push("seat map");
    return route.fallback();
  });
  await page.route(TICKETING, (route) => {
    order.push("ticketing");
    return route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>Operator checkout</title><h1>Operator checkout stand-in</h1>",
    });
  });
  await page.goto(TONIGHT);
  await expect(page.getByRole("status")).toHaveText(/172 checked$/);
  await addison(page).click();
  const sheet = page.getByRole("dialog", { name: HOOKY });
  await expect(sheet).toBeVisible();
  return {
    sheet,
    order,
    seatMapsRead: () =>
      upstream.requests.filter((request) => request.path.startsWith(SEAT_MAP))
        .length,
    roomWhere: (statuses: Readonly<Record<string, string>>) =>
      page.route(`**${SEAT_MAP}**`, async (route) => {
        order.push("seat map");
        const answer = await upstream(new URL(route.request().url()).pathname);
        const room = JSON.parse(await answer.text());
        await route.fulfill({
          status: answer.status,
          contentType: "application/json",
          body: JSON.stringify({
            ...room,
            seats: room.seats.map(
              (seat: { readonly id: string; readonly status: string }) => ({
                ...seat,
                status: statuses[seat.id] ?? seat.status,
              }),
            ),
          }),
        });
      }),
  };
};

const accessible = async (page: Page) => {
  const scan = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(scan.violations).toEqual([]);
  expect(await hitAreasUnder(page, HIT_AREA)).toEqual([]);
};

test("taking a Seat Group re-reads its room first and then navigates to the ticketing URL the Source supplied for that Showtime", {
  tag: "@accessibility",
}, async ({ page }) => {
  const { sheet, order, seatMapsRead } = await opened(page);
  const readBefore = seatMapsRead();
  await accessible(page);

  await sheet.getByRole("button", { name: "Take G6 and G7" }).click();
  await page.waitForURL(TICKETING);

  expect(page.url()).toBe(HOOKY_TICKETING);
  expect(seatMapsRead()).toBe(readBefore + 1);
  expect(order.slice(-2)).toEqual(["seat map", "ticketing"]);
  expect(order.filter((step) => step === "ticketing")).toHaveLength(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Operator checkout stand-in",
  );
});

test("a Seat Group taken while deciding yields the alternatives screen, never a link, and a chosen alternative verifies in turn", {
  tag: "@accessibility",
}, async ({ page }) => {
  const { sheet, order, roomWhere } = await opened(page);
  await roomWhere({ G6: "X" });

  await sheet.getByRole("button", { name: "Take G6 and G7" }).click();
  const gone = page.getByRole("dialog", { name: "G6 and G7 just went." });
  await expect(gone).toBeVisible();
  await expect(gone.getByRole("heading", { level: 2 })).toBeFocused();
  await expect(gone.getByRole("button", { name: /^F6·F7/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(new URL(page.url()).search).toBe(TONIGHT.slice(1));
  expect(order).not.toContain("ticketing");
  await accessible(page);

  await gone.getByRole("button", { name: /^G3·G4/ }).click();
  await gone.getByRole("button", { name: "Take G3 and G4" }).click();
  await page.waitForURL(TICKETING);
  expect(page.url()).toBe(HOOKY_TICKETING);
  expect(order.slice(-2)).toEqual(["seat map", "ticketing"]);
});

test("a Source that cannot be reached yields the retry and no link, and the retry opens once the Source answers", {
  tag: "@accessibility",
}, async ({ page }) => {
  const { sheet, order } = await opened(page);
  const refusing = `**${SEAT_MAP}**`;
  await page.route(refusing, (route) => route.fulfill({ status: 500 }));

  await sheet.getByRole("button", { name: "Take G6 and G7" }).click();
  const unreached = page.getByRole("dialog", {
    name: "The Source could not be reached.",
  });
  await expect(unreached).toBeVisible();
  await expect(unreached.getByRole("heading", { level: 2 })).toBeFocused();
  expect(new URL(page.url()).search).toBe(TONIGHT.slice(1));
  expect(order).not.toContain("ticketing");
  await accessible(page);

  await page.unroute(refusing);
  await unreached.getByRole("button", { name: "Check again" }).click();
  await page.waitForURL(TICKETING);
  expect(page.url()).toBe(HOOKY_TICKETING);
});

test("Escape leaves the hand-off with the list and the query as they were", async ({
  page,
}) => {
  const { sheet } = await opened(page);

  await page.keyboard.press("Escape");

  await expect(sheet).toBeHidden();
  await expect(addison(page)).toBeFocused();
  expect(new URL(page.url()).search).toBe(TONIGHT.slice(1));
});

test("offline the card offers no hand-off, and the reason stands over the list rather than under it", async ({
  page,
  context,
}) => {
  await answeredByTheCorpus(page);
  await page.goto(TONIGHT);
  await expect(page.getByRole("status")).toHaveText(/172 checked$/);

  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));

  await expect(addison(page)).toHaveCount(0);
  const banner = page.getByText(/^Offline\./);
  await expect(banner).toBeVisible();
  expect(
    await banner.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const columns = [0.1, 0.3, 0.5, 0.7, 0.9];
      const rows = [0.25, 0.5, 0.75];
      return columns.flatMap((x) =>
        rows.map((y) => {
          const at = document.elementFromPoint(
            box.x + box.width * x,
            box.y + box.height * y,
          );
          return at !== null && el.contains(at);
        }),
      );
    }),
  ).toEqual(Array.from({ length: 15 }, () => true));
});
