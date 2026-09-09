import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  channelsOf,
  contrastOf,
  luminanceOf,
  NON_TEXT_CONTRAST,
  paintedOn,
  pixelsOf,
  POD_ROOM,
  roomOpened,
} from "./auditorium.fixtures.js";

test.use({ serviceWorkers: "block" });

test(
  "the roving cell's focus ring is painted with :focus after a click and then a key, in two tones, and every non-text mark clears 3:1",
  { tag: "@accessibility" },
  async ({ page }, info) => {
    const dialog = await roomOpened(page, POD_ROOM);
    await dialog.locator('[data-seat="F20"]').click();
    await expect(dialog.locator('[data-seat="F20"]')).toBeFocused();
    const afterTheTap = await page.evaluate(paintedOn);
    await page.keyboard.press("ArrowRight");
    await expect(dialog.locator('[data-seat="F19"]')).toBeFocused();

    const painted = await page.evaluate(paintedOn);
    const lit = await page.evaluate(channelsOf, {
      ground: painted.ground.fill,
      free: painted.free.fill,
      gone: painted.gone.stroke,
      seat: painted.lit.fill,
      tick: painted.tick.stroke,
      ring: painted.focused.outlineColor,
      halo: painted.focused.stroke,
    });
    const ratios = {
      ringOnGround: contrastOf(lit.ring, lit.ground),
      haloOnLitSeat: contrastOf(lit.halo, lit.seat),
      haloOnRing: contrastOf(lit.halo, lit.ring),
      outlineOnGround: contrastOf(lit.gone, lit.ground),
      tickOnGround: contrastOf(lit.tick, lit.ground),
      freeOnGround: contrastOf(lit.free, lit.ground),
    };

    info.annotations.push({
      type: "ring on ground, halo on lit seat, halo on ring, outline on ground, tick on ground, free seat on ground",
      description: Object.values(ratios)
        .map((ratio) => ratio.toFixed(2))
        .join(", "),
    });
    expect(afterTheTap.focused.outlineStyle).toBe("solid");
    expect(afterTheTap.focused.outlineWidth).toBe("2px");
    expect(painted.focused.outlineStyle).toBe("solid");
    expect(painted.focused.outlineWidth).toBe("2px");
    for (const ratio of Object.values(ratios))
      expect(ratio).toBeGreaterThanOrEqual(NON_TEXT_CONTRAST);
  },
);

test("the availability vocabulary separates without hue: solid, outline, a centre dot and a tick are shapes, and the greyscale pass is kept as evidence", {
  tag: "@accessibility",
}, async ({ page }) => {
  const dialog = await roomOpened(page, POD_ROOM);
  const painted = await page.evaluate(paintedOn);
  const dotted = await page.evaluate(
    () => document.querySelector("svg.seat-map pattern .space-dot") !== null,
  );
  mkdirSync("reports/room", { recursive: true });
  await page.addStyleTag({ content: "html { filter: grayscale(1); }" });
  await dialog
    .locator(".map-frame")
    .screenshot({ path: "reports/room/greyscale.png" });

  expect(painted.free.fill).not.toBe("none");
  expect(painted.free.stroke).toBe("none");
  expect(painted.gone.fill).toBe("none");
  expect(painted.gone.stroke).not.toBe("none");
  expect(painted.lit.fill).not.toBe(painted.free.fill);
  expect(painted.tick.stroke).not.toBe("none");
  expect(dotted).toBe(true);
});

test("a wheelchair space is painted solid with a dark centre dot, read off its own pixels", {
  tag: "@accessibility",
}, async ({ page }) => {
  const dialog = await roomOpened(page, POD_ROOM);
  const space = dialog.locator('[data-seat="WC17"]');
  const box = await space.boundingBox();
  if (box === null) throw new Error("WC17 has no box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -960);
  const png = await space.screenshot();
  const pixels = await page.evaluate(pixelsOf, png.toString("base64"));

  expect(contrastOf(pixels.centre, pixels.edge)).toBeGreaterThanOrEqual(
    NON_TEXT_CONTRAST,
  );
  expect(luminanceOf(pixels.centre)).toBeLessThan(luminanceOf(pixels.edge));
});
