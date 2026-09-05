import { fireEvent, screen, within } from "@testing-library/react";
import { cards, type Room, staged } from "./search.fixtures.js";

const HOOKY = "Hooky Entertainment Addison + SDX";
export const HOOKY_TICKETING =
  "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2026-08-28%2B09%3A00&from=mov_det_showtimes&source=desktop&mid=245569&tid=aawza&dfam=webbrowser&showtimehashcode=v2-d2998da8682c402f6a3d3b08e2e04eebbebc86096e8467e63cc506ab808dec5a";

export const opened = async (
  options: Parameters<typeof staged>[0] = {},
  seats = /G6·G7$/,
) => {
  const stage = staged(options);
  await stage.settled();
  fireEvent.click(
    within(cards()[0] ?? document.body).getByRole("button", { name: seats }),
  );
  return {
    stage,
    sheet: within(screen.getByRole("dialog", { name: HOOKY })),
  };
};

export const taken = async (room: Room) => {
  const { stage, sheet } = await opened();
  stage.roomAtHandOff(room);
  fireEvent.click(sheet.getByRole("button", { name: "Take G6 and G7" }));
  await stage.answered();
  return stage;
};

export const dialog = (name: string) =>
  within(screen.getByRole("dialog", { name }));

export const marks = () => {
  const sheet = screen.getByRole("dialog");
  return {
    lost: sheet.querySelector("circle.mp-lost"),
    pair: sheet.querySelector("circle.mp-pair"),
  };
};
