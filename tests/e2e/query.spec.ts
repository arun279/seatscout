import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { answeredByTheCorpus, hitAreasUnder, TONIGHT } from "./corpus.js";

const PHONE = { width: 390, height: 844 };
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const HIT_AREA = 44;
const EVERYTHING =
  "?movie=245569&date=2026-08-28&area=75006&partySize=2&chain=AMC&chain=Landmark&theater=aacbt&theater=aaxju&format=Dolby+Cinema&format=IMAX&amenity=Recliners&from=19%3A00&until=21%3A00&accessibleSeating=true";
const STONEBRIAR = ["558117351", "558782900"];

const settled = async (page: Page) => {
  await expect(page.getByRole("status").first()).toHaveText(/172 checked$/);
};

const sheet = (page: Page) =>
  page.getByRole("dialog", { name: "What are we seeing?" });

test.use({ serviceWorkers: "block", viewport: PHONE });

test("every Query term composes in one search on a phone, one-handed, and the card states all of them", {
  tag: "@accessibility",
}, async ({ page }) => {
  await answeredByTheCorpus(page);
  await page.goto(TONIGHT);
  await settled(page);

  await page.getByRole("button", { name: "Any showtime" }).click();
  await expect(sheet(page).getByRole("button", { name: "3D" })).toBeFocused();
  for (const chip of [
    "IMAX",
    "Dolby Cinema",
    "Recliners",
    "AMC",
    "Landmark",
    "Cinemark Dallas XD and IMAX",
    "AMC Village on the Parkway 9",
  ])
    await sheet(page).getByRole("button", { name: chip, exact: true }).click();
  await sheet(page).getByLabel("From").fill("19:00");
  await sheet(page).getByLabel("Until").fill("21:00");
  await sheet(page).getByLabel("Accessible seating").check();
  const scan = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const onTheSheet = await hitAreasUnder(page, HIT_AREA);
  await sheet(page).getByRole("button", { name: "Find seats" }).click();

  expect(scan.violations).toEqual([]);
  expect(onTheSheet).toEqual([]);
  expect(new URL(page.url()).search).toBe(EVERYTHING);
  await expect(page.locator("header")).toContainText(
    "Fri 28 Aug · 7:00p to 9:00p · Near 75006 · Dolby Cinema or IMAX · Recliners · AMC or Landmark · Cinemark Dallas XD and IMAX or AMC Village on the Parkway 9 · Accessible seating · Reference seat",
  );
  const card = await page.locator("header").boundingBox();
  expect(card?.width).toBeLessThanOrEqual(PHONE.width);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(await hitAreasUnder(page, HIT_AREA)).toEqual([]);
  test.info().annotations.push({
    type: "title card height with every term active, px",
    description: `${card?.height.toFixed(0)}`,
  });
});

test("a half-remembered title resolves as typed", async ({ page }) => {
  await answeredByTheCorpus(page);
  await page.goto(TONIGHT);
  await settled(page);
  await expect(
    page.getByRole("button", { name: "The Dog Stars (2026)" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "The Dog Stars (2026)" }).click();
  await sheet(page).getByLabel("Film").fill("co");
  await expect(
    sheet(page)
      .getByRole("list", { name: /playing near/ })
      .getByRole("button"),
  ).toHaveText(["Colony (2026)", "Coyote vs. Acme"]);
  await sheet(page).getByRole("button", { name: "Coyote vs. Acme" }).click();
  await sheet(page).getByRole("button", { name: "Find seats" }).click();

  expect(new URL(page.url()).searchParams.get("movie")).toBe("246329");
  await expect(
    page.getByRole("button", { name: "Coyote vs. Acme" }),
  ).toBeVisible();
});

test("an accessible-seating Query returns wheelchair Seats", async ({
  page,
}) => {
  await answeredByTheCorpus(page);
  await page.goto(`${TONIGHT}&accessibleSeating=true`);
  await settled(page);

  const seats = await page.locator("article .seats").allTextContents();
  expect(seats.length).toBeGreaterThan(0);
  expect(seats.filter((text) => !/wheelchair|companion/.test(text))).toEqual(
    [],
  );
});

test("the retry re-checks only the failed Showtimes, and Coverage updates accordingly", async ({
  page,
}) => {
  const upstream = await answeredByTheCorpus(page, {
    sequences: Object.fromEntries(
      STONEBRIAR.map((id) => [`/napi/seatMap/${id}`, [500, 500, 500]]),
    ),
  });
  await page.goto(TONIGHT);
  await expect(page.getByRole("status").first()).toHaveText(/170 checked$/);
  await expect(page.getByText("Not everywhere yet.")).toBeVisible();
  const seatMaps = upstream.requested("/napi/seatMap/");
  const listings = upstream.requested("/napi/theaterShowtimeGroupings/");

  await page.getByRole("button", { name: "Retry the two unreached" }).click();
  await settled(page);

  expect(upstream.requested("/napi/seatMap/") - seatMaps).toBe(2);
  expect(upstream.requested("/napi/theaterShowtimeGroupings/")).toBe(listings);
  await expect(page.getByText("Not everywhere yet.")).toBeHidden();
});
