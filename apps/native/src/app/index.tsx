import type { ReactElement } from "react";
import {
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
import { seatProfile, seatScout } from "../host/source.js";
import { Search } from "../search/search.js";

const clock = deviceClock();

export default function Index(): ReactElement | null {
  const now = today();
  const terms = useTerms(now);
  const online = useOnline();
  const profile = useProfile(seatProfile());

  return profile === undefined ? null : (
    <Search
      clock={clock}
      onAsk={(term) => askAbout(terms, term)}
      onHandOff={handOff}
      onLedger={() => openLedger(terms)}
      online={online}
      onRoom={(result) => openRoom(terms, result.showtime.id, result.key)}
      onRun={goTo}
      profile={profile}
      seatscout={seatScout()}
      terms={terms}
      today={now}
    />
  );
}
