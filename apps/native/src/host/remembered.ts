import type { RecentSearch, SeatScout } from "@seatscout/client";
import { type Terms, valuesOf } from "@seatscout/view-logic";
import { useEffect, useState } from "react";

export const useRemembered = (
  seatscout: SeatScout,
  terms: Terms,
): readonly RecentSearch[] | undefined => {
  const [remembered, setRemembered] = useState<readonly RecentSearch[]>();
  const { movie, title, area, partySize } = terms;
  const dates = valuesOf(terms).join(" ");

  useEffect(() => {
    void (
      movie === undefined || area === undefined
        ? seatscout.recent.remembered()
        : seatscout.recent.remember({
            movie,
            title,
            dates: dates.split(" "),
            area,
            partySize,
          })
    ).then(setRemembered);
  }, [seatscout, movie, title, dates, area, partySize]);

  return remembered;
};
