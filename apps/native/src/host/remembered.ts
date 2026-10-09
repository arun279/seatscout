import type { RecentSearch, SeatScout } from "@seatscout/client";
import { type Terms, valuesOf } from "@seatscout/view-logic";
import { useEffect, useState } from "react";

export const useRemembered = (
  seatscout: SeatScout,
): readonly RecentSearch[] | undefined => {
  const [remembered, setRemembered] = useState<readonly RecentSearch[]>();

  useEffect(() => {
    void seatscout.recent.remembered().then(setRemembered);
  }, [seatscout]);

  return remembered;
};

export const useRememberWhenSettled = (
  seatscout: SeatScout,
  terms: Terms,
  settled: boolean,
): void => {
  const { movie, title, area, partySize } = terms;
  const dates = valuesOf(terms).join(" ");

  useEffect(() => {
    if (settled && movie !== undefined && area !== undefined)
      void seatscout.recent.remember({
        movie,
        title,
        dates: dates.split(" "),
        area,
        partySize,
      });
  }, [seatscout, settled, movie, title, dates, area, partySize]);
};
