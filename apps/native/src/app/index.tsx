import { router } from "expo-router";
import type { ReactElement } from "react";
import {
  askAbout,
  goTo,
  handOff,
  openRoom,
  useTerms,
} from "../host/address.js";
import { clock, today } from "../host/clock.js";
import { useOnline } from "../host/online.js";
import { useProfile } from "../host/profile.js";
import { seatProfile, seatscout } from "../host/source.js";
import { Search } from "../search/search.js";

export default function Index(): ReactElement | null {
  const now = today();
  const terms = useTerms(now);
  const online = useOnline();
  const profile = useProfile(seatProfile);

  return profile === undefined ? null : (
    <Search
      clock={clock}
      onAsk={(term) => askAbout(terms, term)}
      onHandOff={(result) => handOff(result.key)}
      onLedger={() => router.push("/ledger")}
      online={online}
      onRoom={(result) => openRoom(terms, result.showtime.id, result.key)}
      onRun={goTo}
      profile={profile}
      seatscout={seatscout}
      terms={terms}
      today={now}
    />
  );
}
