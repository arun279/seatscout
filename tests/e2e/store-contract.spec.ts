import { expect, type Page, test } from "@playwright/test";

const ORIGIN = "https://seatscout.test";

const DIST: Readonly<Record<string, string>> = {
  client: "packages/client/dist",
  web: "apps/web/dist",
};

const AWKWARD_KEY = 'a "quoted" \\ key with a ☃ in it';

const PAGE = `<!doctype html>
<title>Key-value store contract</title>
<h1>Key-value store contract</h1>
<p id="verdict">running</p>
<ul id="checks"></ul>
<script type="module">
  import { storeContract } from "/client/store-contract.js";
  import { browserStore } from "/web/index.js";

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

const fileFor = (pathname: string) => {
  const [, root, file] = pathname.split("/");
  const dist = DIST[root ?? ""];
  return dist === undefined || file === undefined ? null : `${dist}/${file}`;
};

const opened = async (page: Page) => {
  const raised: string[] = [];
  page.on("pageerror", (error) => raised.push(error.message));
  await page.route(`${ORIGIN}/**`, (route) => {
    const asset = fileFor(new URL(route.request().url()).pathname);
    return asset === null
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

  await expect(page.locator("#verdict")).toHaveText("6 of 6 checks passed");
  await expect(page.locator("li[data-verdict='failed']")).toHaveCount(0);
  expect(raised).toEqual([]);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), AWKWARD_KEY),
  ).toBe(
    '{"fetchedAt":7,"catalogue":{"bookable":[],"unbookable":[],"unidentified":[]}}',
  );
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

  await expect(page.locator("#verdict")).toHaveText("6 of 6 checks passed");
  await expect(page.locator("li[data-verdict='failed']")).toHaveCount(0);
  expect(raised).toEqual([]);
});
