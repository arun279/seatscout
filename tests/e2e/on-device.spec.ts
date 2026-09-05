import { AxeBuilder } from "@axe-core/playwright";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import {
  answeredByTheCorpus,
  HIT_AREA,
  hitAreasUnder,
  TONIGHT,
  WCAG,
} from "./corpus.fixtures.js";

const ANOTHER_NIGHT = "/?movie=243819&date=2026-08-28&area=75234&partySize=3";
const PROFILE_KEY = "seatscout.profile.v1";
const RECENT_KEY = "seatscout.recent.v1";
const SEAT_MAP = "/napi/seatMap/";
const A_ROOM = "/napi/seatMap/561478479";
const ROOMS = 172;
const CORPUS_DAY = new Date(2026, 7, 28, 9, 0);

const CHOSEN = {
  "How far back": "0.31",
  "Left or right": "-0.17",
  "Missing your spot": "1.35",
  "Watching at an angle": "0.85",
  "The front rows": "0.55",
  "A wall, or the back row": "0.45",
  "A console between seats": "0.65",
};

const PROFILE_FIELDS = [
  "targetDepth",
  "targetLateral",
  "depthWeight",
  "offAxisWeight",
  "frontBandWeight",
  "wallBandWeight",
  "podDividerWeight",
];

interface Captured {
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string | null;
}

const capturing = (page: Page) => {
  const captured: Captured[] = [];
  page.on("request", (request) => {
    captured.push({
      url: request.url(),
      headers: request.headers(),
      body: request.postData(),
    });
  });
  return captured;
};

const carrying = (captured: readonly Captured[], needles: readonly string[]) =>
  captured.flatMap((request) =>
    needles
      .filter(
        (needle) =>
          request.url.includes(needle) ||
          JSON.stringify(request.headers).includes(needle) ||
          (request.body ?? "").includes(needle),
      )
      .map((needle) => `${needle} in ${request.url}`),
  );

const seatMapsIn = (captured: readonly Captured[]) =>
  captured.filter((request) => request.url.includes(SEAT_MAP)).length;

const settled = (page: Page) =>
  expect(page.getByRole("status")).toHaveText(/172 checked$/);

const editor = (page: Page) =>
  page.getByRole("dialog", { name: "What are we seeing?" });

const stored = (page: Page, key: string) =>
  page.evaluate((name) => localStorage.getItem(name) ?? "", key);

const ringOf = (page: Page) =>
  page.locator("article .mp-target").first().getAttribute("cy");

const rowOf = async (page: Page) =>
  Number(
    /Row (\d+) of/.exec(
      (await page.locator("article .why").first().textContent()) ?? "",
    )?.[1],
  );

const opened = async (context: BrowserContext, path: string) => {
  await context.clock.setFixedTime(CORPUS_DAY);
  const page = await context.newPage();
  await answeredByTheCorpus(page);
  const captured = capturing(page);
  await page.goto(path);
  return { page, captured };
};

test.use({ serviceWorkers: "block" });

test("an adjusted Profile re-ranks the results and moves the target on every card, survives a relaunch, and a recent search re-runs in one tap against fresh seat maps, with neither in any request", async ({
  context,
}) => {
  const first = await opened(context, TONIGHT);
  await settled(first.page);
  const before = {
    row: await rowOf(first.page),
    ring: await ringOf(first.page),
  };
  expect(before.ring).toBe("30.44");

  await first.page.getByRole("button", { name: "Reference seat" }).click();
  for (const [control, value] of Object.entries(CHOSEN))
    await editor(first.page).getByLabel(control).fill(value);
  await editor(first.page).getByRole("button", { name: "Find seats" }).click();

  await expect(
    first.page.getByRole("button", { name: "Custom seat" }),
  ).toBeVisible();
  await settled(first.page);
  await expect(
    first.page.locator("article .mp-target").first(),
  ).toHaveAttribute("cy", "18.92");
  expect(await rowOf(first.page)).toBeLessThan(before.row);
  expect(seatMapsIn(first.captured)).toBe(2 * ROOMS);
  const profile = await stored(first.page, PROFILE_KEY);
  expect(JSON.parse(profile)).toMatchObject({
    targetDepth: 0.31,
    targetLateral: -0.17,
  });
  await first.page.close();

  const relaunch = await opened(context, TONIGHT);
  await expect(
    relaunch.page.getByRole("button", { name: "Custom seat" }),
  ).toBeVisible();
  await settled(relaunch.page);
  await expect(
    relaunch.page.locator("article .mp-target").first(),
  ).toHaveAttribute("cy", "18.92");
  await relaunch.page.getByRole("button", { name: "Custom seat" }).click();
  for (const [control, value] of Object.entries(CHOSEN))
    await expect(editor(relaunch.page).getByLabel(control)).toHaveValue(value);
  await relaunch.page.keyboard.press("Escape");
  await relaunch.page.close();

  const another = await opened(context, ANOTHER_NIGHT);
  await expect(another.page.getByRole("status")).toHaveText(/checked$/);
  await another.page.close();

  const again = await opened(context, "/");
  const recent = again.page.getByRole("region", { name: "Run again" });
  await expect(recent.getByRole("button")).toHaveText([/243819/, /245569/]);
  expect(seatMapsIn(again.captured)).toBe(0);
  await recent
    .getByRole("button", {
      name: "245569, 2 seats · today · 75006",
    })
    .click();
  expect(new URL(again.page.url()).search).toBe(TONIGHT.slice(1));
  await settled(again.page);
  expect(seatMapsIn(again.captured)).toBe(ROOMS);
  const history = await stored(again.page, RECENT_KEY);
  expect(JSON.parse(history)).toHaveLength(2);

  const everyRequest = [
    ...first.captured,
    ...relaunch.captured,
    ...another.captured,
    ...again.captured,
  ];
  expect(
    carrying(everyRequest, [
      ...Object.values(CHOSEN),
      ...PROFILE_FIELDS,
      PROFILE_KEY,
      RECENT_KEY,
      profile,
      history,
      encodeURIComponent(profile),
      encodeURIComponent(history),
    ]),
  ).toEqual([]);
  expect(carrying(again.captured, ["243819", "75234", "partySize=3"])).toEqual(
    [],
  );
});

test("the assertion fires when the Profile or the history is planted in a request, so its silence means something", async ({
  context,
}) => {
  const { page, captured } = await opened(context, TONIGHT);
  await settled(page);
  await page.evaluate(
    async ([room, recentKey]) => {
      await fetch(
        `${room}?recent=${encodeURIComponent(localStorage.getItem(recentKey ?? "") ?? "")}`,
      );
    },
    [A_ROOM, RECENT_KEY],
  );
  const origin = new URL(page.url()).origin;
  const history = await stored(page, RECENT_KEY);

  expect(await stored(page, PROFILE_KEY)).toBe("");
  expect(carrying(captured, [history, encodeURIComponent(history)])).toEqual([
    `${encodeURIComponent(history)} in ${origin}${A_ROOM}?recent=${encodeURIComponent(history)}`,
  ]);
  await page.getByRole("button", { name: "Reference seat" }).click();
  await editor(page).getByLabel("How far back").fill("0.31");
  await editor(page).getByRole("button", { name: "Find seats" }).click();
  await page.evaluate(
    async ([room, key]) => {
      await fetch(room ?? "", {
        headers: { "x-profile": localStorage.getItem(key ?? "") ?? "" },
      });
      await fetch(room ?? "", {
        method: "POST",
        body: localStorage.getItem(key ?? "") ?? "",
      });
    },
    [A_ROOM, PROFILE_KEY],
  );

  expect(carrying(captured, ["targetDepth", "0.31"])).toEqual([
    `targetDepth in ${origin}${A_ROOM}`,
    `0.31 in ${origin}${A_ROOM}`,
    `targetDepth in ${origin}${A_ROOM}`,
    `0.31 in ${origin}${A_ROOM}`,
  ]);
});

test("the Ask sheet with its seat controls carries no WCAG 2.2 AA violation axe can detect, and every control on it reaches 44 px", {
  tag: "@accessibility",
}, async ({ context }) => {
  const { page } = await opened(context, TONIGHT);
  await settled(page);
  await page.getByRole("button", { name: "Reference seat" }).click();
  await expect(editor(page).getByLabel("How far back")).toBeFocused();

  const scan = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const onTheSheet = await hitAreasUnder(page, HIT_AREA);

  expect(scan.violations).toEqual([]);
  expect(onTheSheet).toEqual([]);
});

test("the first screen's recent searches carry no WCAG 2.2 AA violation axe can detect, and each reaches 44 px", {
  tag: "@accessibility",
}, async ({ context }) => {
  const first = await opened(context, TONIGHT);
  await settled(first.page);
  await first.page.close();
  const { page } = await opened(context, "/");
  await expect(page.getByRole("region", { name: "Run again" })).toBeVisible();

  const scan = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const onTheScreen = await hitAreasUnder(page, HIT_AREA);

  expect(scan.violations).toEqual([]);
  expect(onTheScreen).toEqual([]);
});
