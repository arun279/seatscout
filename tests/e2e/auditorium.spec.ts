import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { expect, type Locator, type Page, test } from "@playwright/test";
import {
  LARGEST_ROOM,
  roomOpened,
  roomOpenedFromTheList,
} from "./auditorium.fixtures.js";
import { scanned } from "./corpus.fixtures.js";

const PHONE = { width: 390, height: 844 };
const CPU_SLOWDOWN = 4;
const IDLE_FRAMES = 30;
const PERCENTILE = 0.75;
const GESTURES = 10;
const SAMPLES = "reports/journey/gesture.json";
const CONDITIONS = `${PHONE.width} by ${PHONE.height}, CPU at ${CPU_SLOWDOWN}x`;

interface Cadence {
  readonly idleMs: number;
  readonly intervalsMs: readonly number[];
  readonly mutations: readonly string[];
}

declare global {
  interface Window {
    cadence: {
      idle: number[];
      frames: number[];
      mutations: string[];
      stop: () => void;
    };
  }
}

const watching = (page: Page, frames: number) =>
  page.evaluate((count) => {
    const svg = document.querySelector("svg.seat-map");
    if (svg === null) throw new Error("no map is drawn");
    window.cadence = { idle: [], frames: [], mutations: [], stop: () => {} };
    const observer = new MutationObserver((records) => {
      for (const record of records)
        window.cadence.mutations.push(
          `${record.type}:${record.attributeName ?? ""}:${record.target instanceof Element ? record.target.tagName : "text"}`,
        );
    });
    observer.observe(svg, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    });
    let stopped = false;
    window.cadence.stop = () => {
      stopped = true;
      observer.disconnect();
    };
    return new Promise<void>((resolve) => {
      let last = performance.now();
      const tick = (now: number) => {
        const settling = window.cadence.idle.length < count;
        (settling ? window.cadence.idle : window.cadence.frames).push(
          now - last,
        );
        last = now;
        if (window.cadence.idle.length === count && settling) resolve();
        if (!stopped) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, frames);

const measured = (page: Page): Promise<Cadence> =>
  page.evaluate(() => {
    window.cadence.stop();
    const idle = window.cadence.idle.toSorted((a, b) => a - b);
    return {
      idleMs: idle[Math.floor(idle.length / 2)] ?? 0,
      intervalsMs: window.cadence.frames,
      mutations: window.cadence.mutations,
    };
  });

const pinched = async (page: Page, centre: { x: number; y: number }) => {
  const session = await page.context().newCDPSession(page);
  const spread = (gap: number) => [
    { x: centre.x - gap, y: centre.y },
    { x: centre.x + gap, y: centre.y },
  ];
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: spread(30),
  });
  for (let gap = 34; gap <= 90; gap += 4)
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: spread(gap),
    });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await session.detach();
};

const dragged = async (page: Page, from: { x: number; y: number }) => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let step = 1; step <= 24; step += 1)
    await page.mouse.move(from.x - step * 5, from.y - step * 3);
  await page.mouse.up();
};

const throttled = async (page: Page, rate: number) => {
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate });
  await session.detach();
};

const focusedNow = (page: Page) =>
  page.evaluate(() => {
    const active = document.activeElement;
    if (active === null) return "nothing";
    const name =
      active.getAttribute("name") ??
      active.getAttribute("aria-label") ??
      active.textContent ??
      "";
    return `${active.tagName}:${active.getAttribute("role") ?? ""}:${name}`;
  });

const droppedIn = (cadence: Cadence) =>
  cadence.intervalsMs.filter(
    (interval) => Math.round(interval / cadence.idleMs) > 1,
  ).length;

const p75Of = (cadence: Cadence) => {
  const sorted = cadence.intervalsMs.toSorted((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * PERCENTILE) - 1] ?? 0;
};

const centreOf = async (dialog: Locator) => {
  const box = await dialog.locator("svg.seat-map").boundingBox();
  if (box === null) throw new Error("the map has no box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

const gestured = async (page: Page, dialog: Locator) => {
  const centre = await centreOf(dialog);
  await watching(page, IDLE_FRAMES);
  await pinched(page, centre);
  await page.mouse.wheel(0, -240);
  await dragged(page, centre);
  return measured(page);
};

const each = <Reading>(reading: () => Reading) =>
  Array.from({ length: GESTURES }, reading);

test.use({ serviceWorkers: "block" });

test(
  "the largest captured room pans and zooms at the display's own cadence on a four-times-slower CPU over ten gestures, and only the wrapping group's transform changes while it does",
  { tag: "@performance" },
  async ({ page }, info) => {
    await page.setViewportSize(PHONE);
    let dialog = await roomOpened(page, LARGEST_ROOM);
    await throttled(page, CPU_SLOWDOWN);
    const passes: Cadence[] = [];
    for (let pass = 0; pass < GESTURES; pass += 1) {
      if (pass > 0) {
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        dialog = await roomOpenedFromTheList(page, LARGEST_ROOM);
      }
      passes.push(await gestured(page, dialog));
    }
    await throttled(page, 1);

    const dropped = passes.map(droppedIn);
    mkdirSync("reports/journey", { recursive: true });
    writeFileSync(
      SAMPLES,
      JSON.stringify(
        dropped.map((droppedFrames) => ({
          droppedFrames,
          conditions: CONDITIONS,
        })),
        null,
        2,
      ),
    );
    const mutations = passes.flatMap((cadence) => cadence.mutations);

    info.annotations.push({
      type: "per gesture: frames, idle cadence ms, 75th percentile ms, worst ms, frames dropped",
      description: passes
        .map(
          (cadence, at) =>
            `${cadence.intervalsMs.length}, ${cadence.idleMs.toFixed(1)}, ${p75Of(cadence).toFixed(1)}, ${Math.max(...cadence.intervalsMs).toFixed(1)}, ${dropped[at]}`,
        )
        .join(" | "),
    });
    expect(passes.map((cadence) => cadence.intervalsMs.length > 0)).toEqual(
      each(() => true),
    );
    expect(
      passes.map((cadence) => Math.round(p75Of(cadence) / cadence.idleMs)),
    ).toEqual(each(() => 1));
    expect(new Set(mutations)).toEqual(new Set(["attributes:transform:g"]));
    expect(mutations.length).toBeGreaterThan(0);
    await expect(dialog.locator("svg > g").first()).not.toHaveAttribute(
      "transform",
      "translate(0 0) scale(1)",
    );
    expect(JSON.parse(readFileSync(SAMPLES, "utf8"))).toEqual(
      each(() => ({
        droppedFrames: expect.any(Number),
        conditions: CONDITIONS,
      })),
    );
  },
);

test("the room is six tab stops, carries no WCAG 2.2 AA violation axe can detect, and Escape returns focus to the control that opened it", {
  tag: "@accessibility",
}, async ({ page }) => {
  const dialog = await roomOpened(page, LARGEST_ROOM);
  const scan = await scanned(page);
  const stops: string[] = [];
  for (let pressed = 0; pressed < 10; pressed += 1) {
    stops.push(await focusedNow(page));
    await page.keyboard.press("Tab");
  }
  const onTheScreen = stops.filter(
    (stop) => !stop.startsWith("BODY:") && !stop.startsWith("DIALOG:"),
  );

  expect(scan.violations).toEqual([]);
  expect(onTheScreen.slice(0, 7)).toEqual([
    "rect:gridcell:Seat H14. On the centreline. Bookable. First of your two recommended seats.",
    "INPUT::chosen",
    "BUTTON::H14·H13",
    "BUTTON::‹ Back to the list",
    "BUTTON::ROW H8th row of 14 from the front. 20 seats, 12 bookable.",
    "BUTTON::Back to H14 H13",
    "rect:gridcell:Seat H14. On the centreline. Bookable. First of your two recommended seats.",
  ]);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: LARGEST_ROOM.opensWith }),
  ).toBeFocused();
});
