import type { Search, SearchTerms, SeatScout } from "@seatscout/client";
import {
  type HeldSnapshots,
  heldSnapshots,
  keyOf,
} from "@seatscout/view-logic";
import { useEffect, useState } from "react";

export interface Session {
  readonly search: Search;
  readonly held: HeldSnapshots;
}

interface Holding {
  readonly key: string;
  readonly session: Session;
  holders: number;
}

const live = new Map<string, Holding>();

const opened = (seatscout: SeatScout, asked: SearchTerms): Session => {
  const search = seatscout.search(asked);
  return { search, held: heldSnapshots(search) };
};

export const useSession = (
  seatscout: SeatScout,
  asked: SearchTerms,
): Session => {
  const [holding] = useState(() => {
    const key = keyOf(asked);
    return (
      live.get(key) ?? { key, session: opened(seatscout, asked), holders: 0 }
    );
  });

  useEffect(() => {
    holding.holders += 1;
    live.set(holding.key, holding);
    return () => {
      holding.holders -= 1;
      if (holding.holders === 0) live.delete(holding.key);
    };
  });

  return holding.session;
};
