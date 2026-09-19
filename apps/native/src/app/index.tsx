import { REFERENCE } from "@seatscout/client";
import { router } from "expo-router";
import type { ReactElement } from "react";
import { askAbout, goTo, useTerms } from "../host/address.js";
import { deviceClock, today } from "../host/clock.js";
import { useOnline } from "../host/online.js";
import { seatscout } from "../host/source.js";
import { Search } from "../search/search.js";

const clock = deviceClock();

export default function Index(): ReactElement {
  const now = today();
  const terms = useTerms(now);
  const online = useOnline();

  return (
    <Search
      clock={clock}
      onAsk={(term) => askAbout(terms, term)}
      onHandOff={() => router.push("/hand-off")}
      onLedger={() => router.push("/ledger")}
      online={online}
      onRoom={() => router.push("/room")}
      onRun={goTo}
      profile={REFERENCE}
      seatscout={seatscout}
      terms={terms}
      today={now}
    />
  );
}
