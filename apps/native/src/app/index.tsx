import { REFERENCE } from "@seatscout/client";
import { router } from "expo-router";
import type { ReactElement } from "react";
import { goTo, useTerms } from "../host/address.js";
import { today } from "../host/clock.js";
import { deviceSeatScout } from "../host/source.js";
import { Search } from "../search/search.js";

const seatscout = deviceSeatScout();

export default function Index(): ReactElement {
  const now = today();
  const terms = useTerms(now);

  return (
    <Search
      onAsk={(term) => router.push({ pathname: "/ask", params: { term } })}
      onRun={goTo}
      profile={REFERENCE}
      seatscout={seatscout}
      terms={terms}
      today={now}
    />
  );
}
