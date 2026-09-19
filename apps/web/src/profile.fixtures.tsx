import { fireEvent, screen } from "@testing-library/react";
import type { Stage } from "./search.fixtures.js";
import { ask, NO_MOVIE, staged } from "./search.fixtures.js";

type Staged = Parameters<typeof staged>[0];

export const WEIGHTS = [
  ["Missing your spot", "1", "depthWeight"],
  ["Watching at an angle", "1", "offAxisWeight"],
  ["The front rows", "0.25", "frontBandWeight"],
  ["A wall, or the back row", "0.25", "wallBandWeight"],
  ["A console between seats", "0.25", "podDividerWeight"],
] as const;

export const opened = async (
  options: Staged = {},
): Promise<{ stage: Stage; editor: ReturnType<typeof ask> }> => {
  const stage = staged({ terms: NO_MOVIE, ...options });
  if (stage.searches.length > 0) await stage.settled();
  fireEvent.click(screen.getByRole("button", { name: /seat$/i }));
  return { stage, editor: ask() };
};

export const slide = (control: HTMLElement, value: number): boolean =>
  fireEvent.change(control, { target: { value: `${value}` } });

export const room = (): Element => {
  const drawn = document.querySelector("dialog svg.seat-picker");
  if (drawn === null) throw new Error("the sheet draws no room");
  return drawn;
};
