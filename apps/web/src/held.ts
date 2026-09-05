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
  let watching = 0;

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
    subscribe: (onChange) => {
      watching += 1;
      const stop = changes.subscribe(onChange);
      return () => {
        stop();
        watching -= 1;
        if (watching === 0) search.abort();
      };
    },
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
