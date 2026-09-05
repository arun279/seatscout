import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { LARGEST_ROOM, roomOpened, WCAG } from "./auditorium.fixtures.js";

const PHONE = { width: 390, height: 844 };
const CPU_SLOWDOWN = 4;
const IDLE_FRAMES = 30;
const PERCENTILE = 0.75;

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

test.use({ serviceWorkers: "block" });

test(
  "the largest captured room pans and zooms at the display's own cadence on a four-times-slower CPU, and only the wrapping group's transform changes while it does",
  { tag: "@performance" },
  async ({ page }, info) => {
    await page.setViewportSize(PHONE);
    const dialog = await roomOpened(page, LARGEST_ROOM);
    const box = await dialog.locator("svg.seat-map").boundingBox();
    if (box === null) throw new Error("the map has no box");
    const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await throttled(page, CPU_SLOWDOWN);

    await watching(page, IDLE_FRAMES);
    await pinched(page, centre);
    await page.mouse.wheel(0, -240);
    await dragged(page, centre);
    const cadence = await measured(page);
    await throttled(page, 1);
    const sorted = cadence.intervalsMs.toSorted((a, b) => a - b);
    const p75 = sorted[Math.ceil(sorted.length * PERCENTILE) - 1] ?? 0;
    const dropped = cadence.intervalsMs.filter(
      (interval) => Math.round(interval / cadence.idleMs) > 1,
    );

    info.annotations.push({
      type: "frames during the gesture, idle cadence ms, 75th percentile ms, worst ms, frames dropped",
      description: `${cadence.intervalsMs.length}, ${cadence.idleMs.toFixed(1)}, ${p75.toFixed(1)}, ${Math.max(...cadence.intervalsMs).toFixed(1)}, ${dropped.length}`,
    });
    expect(cadence.intervalsMs.length).toBeGreaterThan(0);
    expect(Math.round(p75 / cadence.idleMs)).toBe(1);
    expect(new Set(cadence.mutations)).toEqual(
      new Set(["attributes:transform:g"]),
    );
    expect(cadence.mutations.length).toBeGreaterThan(0);
    await expect(dialog.locator("svg > g").first()).not.toHaveAttribute(
      "transform",
      "translate(0 0) scale(1)",
    );
  },
);

test("the room is six tab stops, carries no WCAG 2.2 AA violation axe can detect, and Escape returns focus to the control that opened it", {
  tag: "@accessibility",
}, async ({ page }) => {
  const dialog = await roomOpened(page, LARGEST_ROOM);
  const scan = await new AxeBuilder({ page }).withTags(WCAG).analyze();
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
    "INPUT::candidate",
    "BUTTON::Continue at Cinemark Theatres",
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
