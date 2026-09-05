import { expect, type Page } from "@playwright/test";
import {
  fakeUpstream,
  routeOf,
  seatMapCaptures,
} from "@seatscout/core/testing";

const TONIGHT = "/?movie=245569&date=2026-08-28&area=75006&partySize=2";
export const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
export const NON_TEXT_CONTRAST = 3;

export interface RoomOnTheList {
  readonly showtime: number;
  readonly capture: string;
  readonly opensWith: string;
}

export const LARGEST_ROOM: RoomOnTheList = {
  showtime: 557962494,
  capture: "561865199",
  opensWith: "See H14·H13 in the room at Cinemark Frisco Square and XD, 10:10p",
};

export const POD_ROOM: RoomOnTheList = {
  showtime: 557962491,
  capture: "561462741",
  opensWith: "See G14·G13 in the room at Cinemark Frisco Square and XD, 1:25p",
};

const capturedRoom = (capture: string) => {
  const room = [...seatMapCaptures.values()].find(
    (held) => routeOf(held.request.path) === `/napi/seatMap/${capture}`,
  );
  if (room === undefined) throw new Error(`${capture} was never captured`);
  return { status: room.status, body: JSON.stringify(room.body) };
};

const answeredByTheCorpus = (page: Page) => {
  const upstream = fakeUpstream({
    seed: 4,
    standInAuditoriums: true,
    routes: Object.fromEntries(
      [LARGEST_ROOM, POD_ROOM].map((room) => [
        `/napi/seatMap/${room.showtime}`,
        capturedRoom(room.capture),
      ]),
    ),
  });
  return page.route("**/napi/**", async (route) => {
    const answer = await upstream(new URL(route.request().url()).pathname);
    await route.fulfill({
      status: answer.status,
      contentType: "application/json",
      body: await answer.text(),
    });
  });
};

export const roomOpened = async (page: Page, room: RoomOnTheList) => {
  await answeredByTheCorpus(page);
  await page.goto(TONIGHT);
  await expect(page.getByRole("status")).toHaveText(/172 checked$/);
  await page.getByRole("button", { name: room.opensWith }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  return page.getByRole("dialog");
};

export interface Painted {
  readonly fill: string;
  readonly stroke: string;
  readonly outlineColor: string;
  readonly outlineStyle: string;
  readonly outlineWidth: string;
}

export interface Colours {
  readonly ground: string;
  readonly free: string;
  readonly gone: string;
  readonly seat: string;
  readonly tick: string;
  readonly ring: string;
  readonly halo: string;
}

type Rgb = readonly [number, number, number];

export const luminanceOf = ([r, g, b]: Rgb) => {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

export const contrastOf = (first: Rgb, second: Rgb) => {
  const one = luminanceOf(first);
  const other = luminanceOf(second);
  return (Math.max(one, other) + 0.05) / (Math.min(one, other) + 0.05);
};

export const channelsOf = (colours: Colours): Record<keyof Colours, Rgb> => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("no canvas to resolve colours on");
  const resolved = (colour: string): Rgb => {
    context.fillStyle = colour;
    context.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
  };
  return {
    ground: resolved(colours.ground),
    free: resolved(colours.free),
    gone: resolved(colours.gone),
    seat: resolved(colours.seat),
    tick: resolved(colours.tick),
    ring: resolved(colours.ring),
    halo: resolved(colours.halo),
  };
};

export const paintedOn = () => {
  const styleOf = (selector: string): Painted => {
    const element = document.querySelector(selector);
    if (element === null) throw new Error(`${selector} is not drawn`);
    const style = getComputedStyle(element);
    return {
      fill: style.fill,
      stroke: style.stroke,
      outlineColor: style.outlineColor,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  };
  return {
    ground: styleOf("svg.seat-map .ground"),
    free: styleOf("svg.seat-map .seat.bookable:not(.space):not(.lit)"),
    gone: styleOf("svg.seat-map .seat.unbookable:not(.space)"),
    lit: styleOf("svg.seat-map .seat.lit"),
    tick: styleOf("svg.seat-map .tick"),
    focused: styleOf("svg.seat-map .seat:focus"),
  };
};

export const pixelsOf = async (png: string) => {
  const blob = await (await fetch(`data:image/png;base64,${png}`)).blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("no canvas to read pixels on");
  context.drawImage(bitmap, 0, 0);
  const across = (fraction: number): Rgb => {
    const [r = 0, g = 0, b = 0] = context.getImageData(
      Math.floor(bitmap.width * fraction),
      Math.floor(bitmap.height / 2),
      1,
      1,
    ).data;
    return [r, g, b];
  };
  return { centre: across(0.5), edge: across(0.22) };
};
