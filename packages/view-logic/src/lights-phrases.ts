import type { HouseLights } from "@seatscout/client";

export const HOUSE_LIGHTS: {
  readonly label: string;
  readonly choices: readonly {
    readonly value: HouseLights;
    readonly text: string;
  }[];
  readonly note: string;
} = {
  label: "House lights",
  choices: [
    { value: "system", text: "System" },
    { value: "down", text: "Down" },
    { value: "up", text: "Up" },
  ],
  note: "System follows your phone's own light and dark setting. The choice is kept on this phone.",
};

export const lightsSaidOf = (
  chosen: HouseLights,
  now: Exclude<HouseLights, "system">,
): string =>
  chosen === "system" ? `System · ${now} right now` : `Always ${chosen}`;
