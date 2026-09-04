import type { Search, Snapshot } from "@seatscout/client";
import { signal } from "./signal.js";

export interface HeldSnapshots {
  readonly snapshot: () => Snapshot;
  readonly painted: () => Snapshot | null;
  readonly subscribe: (onChange: () => void) => () => void;
  readonly hold: () => void;
  readonly release: () => void;
}

export const heldSnapshots = (search: Search): HeldSnapshots => {
  const changes = signal();
  let shown = search.snapshot();
  let painted: Snapshot | null = null;
  let holding = false;
  let missed = false;

  const show = () => {
    shown = search.snapshot();
    if (shown.phase === "settled") painted = shown;
    changes.notify();
  };

  search.subscribe(() => {
    if (holding) missed = true;
    else show();
  });

  return {
    snapshot: () => shown,
    painted: () => painted,
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
