import type { RecentSearch, SeatScout } from "@seatscout/client";
import type { Terms } from "@seatscout/view-logic";
import { useEffect, useState } from "react";

export const useRemembered = (
  seatscout: SeatScout,
  terms: Terms,
): readonly RecentSearch[] | undefined => {
  const [remembered, setRemembered] = useState<readonly RecentSearch[]>();
  const { movie, date, area, partySize } = terms;

  useEffect(() => {
    void (
      movie === undefined || area === undefined
        ? seatscout.recent.remembered()
        : seatscout.recent.remember({ movie, date, area, partySize })
    ).then(setRemembered);
  }, [seatscout, movie, date, area, partySize]);

  return remembered;
};
