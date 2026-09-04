import type { Search, Snapshot } from "@seatscout/client";
import { signal } from "./signal.js";

export interface HeldSnapshots {
  readonly snapshot: () => Snapshot;
  readonly subscribe: (onChange: () => void) => () => void;
  readonly hold: () => void;
  readonly release: () => void;
}

export const heldSnapshots = (search: Search): HeldSnapshots => {
  const changes = signal();
  let shown = search.snapshot();
  let holding = false;
  let missed = false;

  const show = () => {
    shown = search.snapshot();
    changes.notify();
  };

  search.subscribe(() => {
    if (holding) missed = true;
    else show();
  });

  return {
    snapshot: () => shown,
    subscribe: changes.subscribe,
    hold: () => {
      holding = true;
    },
    release: () => {
      holding = false;
      if (!missed) return;
      missed = false;
      show();
    },
  };
};
