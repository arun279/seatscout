import type { SeatGroupResult, SeatProfile } from "@seatscout/client";
import { askedFrom, ROOM_DRAWS_HERE, type Terms } from "@seatscout/view-logic";
import { router, useLocalSearchParams } from "expo-router";
import type { ReactElement } from "react";
import {
  LIST_PANE,
  Panes,
  useTwoPanes,
  Waiting,
} from "../design-system/panes.js";
import {
  adjustTo,
  askAbout,
  goTo,
  handOff,
  openLedger,
  openRoom,
  useTerms,
} from "../host/address.js";
import { deviceClock, today } from "../host/clock.js";
import { useOnline } from "../host/online.js";
import { useProfile } from "../host/profile.js";
import { seatProfile, seatscout } from "../host/source.js";
import { Opened } from "../room/opened.js";
import { Search } from "../search/search.js";

const clock = deviceClock();

const besideTheList = (result: SeatGroupResult): void => {
  router.setParams({ showtime: `${result.showtime.id}`, group: result.key });
};

const RoomBeside = ({
  terms,
  profile,
  date,
}: {
  readonly terms: Terms;
  readonly profile: SeatProfile;
  readonly date: string;
}) => {
  const { showtime } = useLocalSearchParams<{ readonly showtime?: string }>();
  const asked = askedFrom(terms, profile, date);

  return asked === null || showtime === undefined ? (
    <Waiting said={ROOM_DRAWS_HERE} />
  ) : (
    <Opened asked={asked} date={date} />
  );
};

export default function Index(): ReactElement | null {
  const held = useLocalSearchParams();
  const now = today();
  const terms = useTerms(now);
  const online = useOnline();
  const profile = useProfile(seatProfile);
  const wide = useTwoPanes();

  if (profile === undefined) return null;

  const search = (
    <Search
      clock={clock}
      onAdjust={(adjusted) => adjustTo(adjusted, held)}
      onAsk={(term) => askAbout(terms, term)}
      onHandOff={handOff}
      onLedger={() => openLedger(terms)}
      online={online}
      onRoom={
        wide
          ? besideTheList
          : (result) => openRoom(terms, result.showtime.id, result.key)
      }
      onRun={goTo}
      profile={profile}
      seatscout={seatscout}
      span={wide ? LIST_PANE : undefined}
      terms={terms}
      today={now}
    />
  );

  return wide ? (
    <Panes
      detail={<RoomBeside date={now} profile={profile} terms={terms} />}
      list={search}
    />
  ) : (
    search
  );
}
