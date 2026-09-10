import { expect, type Page, test } from "@playwright/test";
import {
  capturedRooms,
  LARGEST_ROOM,
  roomOpenedFromTheList,
} from "./auditorium.fixtures.js";
import { accessible, answeredByTheCorpus, TONIGHT } from "./corpus.fixtures.js";

const HOOKY = "Hooky Entertainment Addison + SDX";
const TICKETING = "**/transaction/ticketing/**";
const OPERATOR =
  "<!doctype html><title>Operator checkout</title><h1>Operator checkout stand-in</h1>";

const theFirstOpen = async (page: Page) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Two seats together",
  );
  await accessible(page);
};

const theEditor = async (page: Page) => {
  await page.getByRole("button", { name: "Find seats" }).click();
  const ask = page.getByRole("dialog", { name: "What are we seeing?" });
  await expect(ask).toBeVisible();
  await expect(ask.getByLabel("Near, by postal code")).toBeFocused();
  await accessible(page);

  await ask.getByLabel("Near, by postal code").fill("75006");
  await ask.getByLabel("Date").fill("2026-08-28");
  await ask.getByLabel("Film").fill("dog");
  await ask.getByRole("button", { name: "The Dog Stars (2026)" }).click();
  await ask.getByRole("button", { name: "Find seats" }).click();
  await expect(ask).toBeHidden();
};

const theResults = async (page: Page) => {
  await expect(page.getByRole("status")).toHaveText(
    /176 candidates · 172 checked$/,
  );
  expect(new URL(page.url()).search).toBe(TONIGHT.slice(1));
  await accessible(page);
};

const theRoom = async (page: Page) => {
  const room = await roomOpenedFromTheList(page, LARGEST_ROOM);
  await expect(room.getByRole("grid")).toBeVisible();
  await expect(
    room.getByRole("gridcell", {
      name: /First of your two recommended seats\.$/,
    }),
  ).toBeFocused();
  await accessible(page);

  await room.getByRole("button", { name: "‹ Back to the list" }).click();
  await expect(room).toBeHidden();
};

const theHandOff = async (page: Page) => {
  await page
    .getByRole("article", { name: `${HOOKY}, 9:00a, SDX` })
    .getByRole("button", { name: "G6·G7" })
    .click();
  const sheet = page.getByRole("dialog", { name: HOOKY });
  await expect(sheet).toBeVisible();
  await accessible(page);

  await sheet.getByRole("button", { name: "Take G6 and G7" }).click();
  await page.waitForURL(TICKETING);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Operator checkout stand-in",
  );
};

const theSearchBehindIt = async (page: Page) => {
  await page.goBack();
  await expect(page.getByRole("status")).toHaveText(/172 checked$/);
  expect(new URL(page.url()).search).toBe(TONIGHT.slice(1));
  await accessible(page);
};

test("one session walks the whole journey, from the first open through the editor, the results, a room and the hand-off to the operator's page and back to the search behind it", {
  tag: "@accessibility",
}, async ({ page }) => {
  await answeredByTheCorpus(page, { routes: capturedRooms() });
  await page.route(TICKETING, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: OPERATOR }),
  );

  await theFirstOpen(page);
  await theEditor(page);
  await theResults(page);
  await theRoom(page);
  await theHandOff(page);
  await theSearchBehindIt(page);
});
