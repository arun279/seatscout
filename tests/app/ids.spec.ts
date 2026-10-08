import { expect, test } from "@playwright/test";
import { violationsOn } from "./app.fixtures.js";

test("the scan names an id two elements share, and only that one, so a drawing cannot borrow another's gradient", async ({
  page,
}) => {
  await page.setContent(
    '<main><svg><linearGradient id="glow"/></svg><svg><linearGradient id="glow"/></svg><svg><linearGradient id="edge"/></svg></main>',
  );

  expect(
    (await violationsOn(page)).filter((found) => found.id === "id-shared"),
  ).toEqual([{ id: "id-shared", targets: ["#glow"] }]);
});
