import { REFERENCE } from "@seatscout/client";
import type { ReactElement } from "react";
import { askAbout, goTo, useTerms } from "../host/address.js";
import { today } from "../host/clock.js";
import { seatscout } from "../host/source.js";
import { Search } from "../search/search.js";

export default function Index(): ReactElement {
  const now = today();
  const terms = useTerms(now);

  return (
    <Search
      onAsk={(term) => askAbout(terms, term)}
      onRun={goTo}
      profile={REFERENCE}
      seatscout={seatscout}
      terms={terms}
      today={now}
    />
  );
}
