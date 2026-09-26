import { expect, test } from "@playwright/test";
import { ASKING, answeredByTheCorpus, violationsOn } from "./app.fixtures.js";

test("every screen of the app's web build, from Ask to the Room, carries no WCAG 2.2 AA violation axe can detect", {
  tag: "@accessibility",
}, async ({ page }) => {
  await answeredByTheCorpus(page);
  await page.goto(ASKING);
  const find = page.getByRole("button", { name: "Find seats" });
  await expect(find).toBeVisible();
  expect(await violationsOn(page)).toEqual([]);

  await find.click();
  const film = page.getByRole("textbox", { name: "Film" });
  await expect(film).toBeVisible();
  expect(await violationsOn(page)).toEqual([]);

  await film.fill("Dog Stars");
  await page.getByRole("button", { name: "The Dog Stars (2026)" }).click();
  await page
    .getByTestId("dock")
    .getByRole("button", { name: "Find seats" })
    .click();
  const seats = page.getByTestId("seats").first();
  await expect(seats).toBeVisible();
  expect(await violationsOn(page)).toEqual([]);

  await seats.click();
  await expect(page.getByText("Taking the seats")).toBeVisible();
  expect(await violationsOn(page)).toEqual([]);

  await page.goBack();
  await page.getByTestId("body").first().click();
  await expect(page.getByText("The room")).toBeVisible();
  expect(await violationsOn(page)).toEqual([]);
});
