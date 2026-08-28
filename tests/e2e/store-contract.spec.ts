import { expect, type Page, test } from "@playwright/test";

const ORIGIN = "https://seatscout.test";

const MODULES: Readonly<Record<string, string>> = {
  "/contract.js": "packages/client/dist/store-contract.js",
  "/store.js": "apps/web/dist/store.js",
};

const AWKWARD_KEY = 'a "quoted" \\ key with a ☃ in it';

const PAGE = `<!doctype html>
<title>Key-value store contract</title>
<h1>Key-value store contract</h1>
<p id="verdict">running</p>
<ul id="checks"></ul>
<script type="module">
  import { storeContract } from "/contract.js";
  import { browserStore } from "/store.js";

  const checks = await storeContract(browserStore());
  document.querySelector("#checks").replaceChildren(
    ...checks.map(({ name, failure }) => {
      const item = document.createElement("li");
      item.dataset.verdict = failure === null ? "passed" : "failed";
      item.textContent = failure === null ? name : name + " — " + failure;
      return item;
    }),
  );
  const passed = checks.filter(({ failure }) => failure === null).length;
  document.querySelector("#verdict").textContent =
    passed + " of " + checks.length + " checks passed";
</script>`;

const opened = async (page: Page) => {
  const raised: string[] = [];
  page.on("pageerror", (error) => raised.push(error.message));
  await page.route(`${ORIGIN}/**`, (route) => {
    const asset = MODULES[new URL(route.request().url()).pathname];
    return asset === undefined
      ? route.fulfill({ contentType: "text/html", body: PAGE })
      : route.fulfill({ contentType: "text/javascript", path: asset });
  });
  await page.goto(`${ORIGIN}/`);
  return raised;
};

test("the browser adapter satisfies the store contract against real Web Storage", async ({
  page,
}) => {
  const raised = await opened(page);

  await expect(page.locator("#verdict")).toHaveText("5 of 5 checks passed");
  await expect(page.locator("li[data-verdict='failed']")).toHaveCount(0);
  expect(raised).toEqual([]);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), AWKWARD_KEY),
  ).toBe('{"fetchedAt":6,"catalogue":{"bookable":[],"unbookable":[]}}');
});

test("the browser adapter satisfies the same contract where storage is refused", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get: () => {
        throw new DOMException("storage is disabled", "SecurityError");
      },
    });
  });
  const raised = await opened(page);

  await expect(page.locator("#verdict")).toHaveText("5 of 5 checks passed");
  await expect(page.locator("li[data-verdict='failed']")).toHaveCount(0);
  expect(raised).toEqual([]);
});
