import type { HouseLights, KeyValueStore } from "@seatscout/client";
import { signal } from "@seatscout/view-logic";
import { useSyncExternalStore } from "react";
import { Appearance, type ColorSchemeName } from "react-native";

const KEY = "seatscout.appearance.v1";

const SCHEMES: Readonly<Record<HouseLights, ColorSchemeName>> = {
  system: "unspecified",
  down: "dark",
  up: "light",
};

const isLights = (kept: unknown): kept is HouseLights =>
  Object.keys(SCHEMES).some((lights) => lights === kept);

export interface HeldLights {
  readonly snapshot: () => HouseLights | undefined;
  readonly subscribe: (onChange: () => void) => () => boolean;
  readonly choose: (lights: HouseLights) => void;
}

export const overriding =
  (web: boolean) =>
  (lights: HouseLights): void => {
    if (!web) Appearance.setColorScheme(SCHEMES[lights]);
  };

export const heldLights = (
  store: KeyValueStore,
  apply: (lights: HouseLights) => void,
): HeldLights => {
  const changes = signal();
  let held: HouseLights | undefined;

  const hold = (lights: HouseLights) => {
    held = lights;
    apply(lights);
    changes.notify();
  };

  void store.read(KEY).then((kept) => {
    if (held === undefined) hold(isLights(kept) ? kept : "system");
  });

  return {
    snapshot: () => held,
    subscribe: changes.subscribe,
    choose: (lights) => {
      hold(lights);
      void store.write(KEY, lights);
    },
  };
};

export const useLights = (held: HeldLights): HouseLights | undefined =>
  useSyncExternalStore(held.subscribe, held.snapshot);
