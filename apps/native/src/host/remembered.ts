import type { RecentSearch, SeatScout } from "@seatscout/client";
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
