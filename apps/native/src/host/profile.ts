import type { SeatProfile, SeatScout } from "@seatscout/client";
import { signal } from "@seatscout/view-logic";
import { useSyncExternalStore } from "react";

export interface HeldProfile {
  readonly snapshot: () => SeatProfile | undefined;
  readonly subscribe: (onChange: () => void) => () => boolean;
  readonly choose: (profile: SeatProfile) => void;
}

export const heldProfile = (seatscout: SeatScout): HeldProfile => {
  const changes = signal();
  let held: SeatProfile | undefined;

  void seatscout.profile.remembered().then((remembered) => {
    held ??= remembered;
    changes.notify();
  });

  return {
    snapshot: () => held,
    subscribe: changes.subscribe,
    choose: (profile) => {
      held = profile;
      changes.notify();
      void seatscout.profile.remember(profile);
    },
  };
};

export const useProfile = (profile: HeldProfile): SeatProfile | undefined =>
  useSyncExternalStore(profile.subscribe, profile.snapshot);
