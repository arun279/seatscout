import { expect, test } from "@playwright/test";

test("Chromium finds nothing that stops the shell being installed", async ({
  page,
}) => {
  await page.goto("/");
  const devtools = await page.context().newCDPSession(page);

  const manifest = await devtools.send("Page.getAppManifest");
  const { installabilityErrors } = await devtools.send(
    "Page.getInstallabilityErrors",
  );

  expect(manifest.errors).toEqual([]);
  expect(installabilityErrors).toEqual([]);
});

test("the page names its icon, so no browser has to ask for one it does not have", async ({
  page,
}) => {
  await page.goto("/");

  const declared = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        "link[rel='icon'], link[rel='apple-touch-icon']",
      ),
    ].map((link) => link.getAttribute("href")),
  );
  const answered = await page.evaluate(async () => {
    const statuses: [string, number][] = [];
    for (const path of [
      "/favicon.ico",
      "/icon.svg",
      "/icon-192.png",
      "/icon-512.png",
      "/apple-touch-icon.png",
    ])
      statuses.push([path, (await fetch(path)).status]);
    return statuses;
  });

  expect(declared).toEqual(["/icon.svg", "/apple-touch-icon.png"]);
  expect(answered).toEqual([
    ["/favicon.ico", 200],
    ["/icon.svg", 200],
    ["/icon-192.png", 200],
    ["/icon-512.png", 200],
    ["/apple-touch-icon.png", 200],
  ]);
});
