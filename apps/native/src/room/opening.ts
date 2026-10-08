import type {
  Auditorium,
  PlacedGroup,
  SearchTerms,
  SeatGroupResult,
  SeatScout,
} from "@seatscout/client";
import { useMemo, useSyncExternalStore } from "react";
import { useSession } from "../host/session.js";

export interface Opened {
  readonly auditorium: Auditorium;
  readonly result: SeatGroupResult;
  readonly opening: PlacedGroup;
}

export const useOpenedRoom = (
  seatscout: SeatScout,
  asked: SearchTerms,
  showtime: string | undefined,
  group: string | undefined,
): Opened | null => {
  const session = useSession(seatscout, asked);
  const results = useSyncExternalStore(
    session.held.subscribe,
    () => session.held.snapshot().results,
  );
  const result = results.find((found) => `${found.showtime.id}` === showtime);

  return useMemo(() => {
    if (result === undefined) return null;
    const auditorium = session.search.auditorium(result);
    return {
      auditorium,
      result,
      opening:
        auditorium.offered.find((offered) => offered.group.key === group) ??
        auditorium.recommended,
    };
  }, [group, result, session]);
};
