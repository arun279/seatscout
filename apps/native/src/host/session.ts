import type { Search, SearchTerms, SeatScout } from "@seatscout/client";
import { type HeldSnapshots, heldSnapshots } from "@seatscout/view-logic";
import { useEffect, useState } from "react";

export interface Session {
  readonly search: Search;
  readonly held: HeldSnapshots;
}

interface Holding {
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
  const key = JSON.stringify(asked);
  const [session] = useState(
    () => live.get(key)?.session ?? opened(seatscout, asked),
  );

  useEffect(() => {
    const holding = live.get(key) ?? { session, holders: 0 };
    holding.holders += 1;
    live.set(key, holding);
    return () => {
      holding.holders -= 1;
      if (holding.holders === 0) live.delete(key);
    };
  }, [key, session]);

  return session;
};
