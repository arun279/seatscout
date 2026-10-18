import type { HouseLights, KeyValueStore } from "@seatscout/client";
import { signal } from "@seatscout/view-logic";
import { useSyncExternalStore } from "react";

const KEY = "seatscout.houseLights.v1";

const HELD: readonly HouseLights[] = ["down", "up"];

const keptAs = (kept: unknown): HouseLights =>
  HELD.find((lights) => lights === kept) ?? "system";

export interface HeldLights {
  readonly snapshot: () => HouseLights | undefined;
  readonly subscribe: (onChange: () => void) => () => boolean;
  readonly choose: (lights: HouseLights) => void;
}

export const heldLights = (store: KeyValueStore): HeldLights => {
  const changes = signal();
  let held: HouseLights | undefined;

  const hold = (lights: HouseLights) => {
    held = lights;
    changes.notify();
  };

  void store.read(KEY).then((kept) => {
    if (held === undefined) hold(keptAs(kept));
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
