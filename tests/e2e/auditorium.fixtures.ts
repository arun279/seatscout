import { expect, type Page } from "@playwright/test";
import {
  fakeUpstream,
  routeOf,
  seatMapCaptures,
} from "@seatscout/core/testing";

export const TONIGHT = "/?movie=245569&date=2026-08-28&area=75006&partySize=2";
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

export const luminancesOf = (
  colours: Colours,
): Record<keyof Colours, number> => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("no canvas to resolve colours on");
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (colour: string) => {
    context.fillStyle = colour;
    context.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  return {
    ground: luminance(colours.ground),
    free: luminance(colours.free),
    gone: luminance(colours.gone),
    seat: luminance(colours.seat),
    tick: luminance(colours.tick),
    ring: luminance(colours.ring),
    halo: luminance(colours.halo),
  };
};

export const contrastOf = (first: number, second: number) =>
  (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);

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
    free: styleOf("svg.seat-map .seat.free:not(.space):not(.lit)"),
    gone: styleOf("svg.seat-map .seat.gone:not(.space)"),
    lit: styleOf("svg.seat-map .seat.lit"),
    tick: styleOf("svg.seat-map .tick"),
    focused: styleOf("svg.seat-map .seat:focus"),
  };
};
