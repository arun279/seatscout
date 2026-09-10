import { act, fireEvent, screen, within } from "@testing-library/react";
import { staged } from "./search.fixtures.js";
import type { QueryScreen, Stage } from "./search.fixtures.js";
import { roomRoutes } from "./rooms.fixtures.js";
import type { CapturedRoom } from "./rooms.fixtures.js";

export const nameOf = (element: Element): string | null =>
  element.getAttribute("aria-label");

export interface RoomScreen {
  readonly dialog: HTMLElement;
  readonly room: QueryScreen;
  readonly focused: () => Element;
  readonly grid: () => HTMLElement;
  readonly rowBar: () => HTMLElement;
  readonly press: (
    key: string,
    options?: { readonly ctrlKey?: boolean },
  ) => void;
  readonly tabStops: () => string[];
}

const stopOf = (element: HTMLElement) => {
  if (element instanceof HTMLInputElement && element.type === "radio")
    return `radiogroup:${element.name}`;
  const role = element.getAttribute("role") ?? element.tagName.toLowerCase();
  return role === "button"
    ? `button:${element.getAttribute("aria-label") ?? element.textContent}`
    : role;
};

const roomScreen = (): RoomScreen => {
  const dialog = screen.getByRole("dialog");
  const room = within(dialog);
  const focused = () => {
    const active = document.activeElement;
    if (!(active instanceof Element)) throw new Error("nothing is focused");
    return active;
  };
  return {
    dialog,
    room,
    focused,
    grid: () => room.getByRole("grid"),
    rowBar: () => room.getByRole("status"),
    press: (key: string, options: { readonly ctrlKey?: boolean } = {}) => {
      fireEvent.keyDown(focused(), { key, ...options });
    },
    tabStops: () => [
      ...new Set(
        [
          ...dialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), [tabindex="0"]',
          ),
        ].map(stopOf),
      ),
    ],
  };
};

export const opened = async (
  room: CapturedRoom,
): Promise<Stage & RoomScreen> => {
  const stage = staged({ script: { routes: roomRoutes() } });
  await stage.settled();
  fireEvent.click(
    screen.getByRole("button", {
      name: `See ${room.spoken} in the room at ${room.card}`,
    }),
  );
  await act(() => Promise.resolve());
  return { ...stage, ...roomScreen() };
};
