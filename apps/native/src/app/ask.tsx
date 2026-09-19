import type { ReactElement } from "react";
import { Ask } from "../ask/ask.js";
import {
  keepAsItWas,
  runInstead,
  useFocus,
  useTerms,
} from "../host/address.js";
import { today } from "../host/clock.js";
import { seatscout } from "../host/source.js";

export default function AskRoute(): ReactElement {
  const now = today();

  return (
    <Ask
      focus={useFocus()}
      onFind={runInstead}
      onKeep={keepAsItWas}
      seatscout={seatscout}
      terms={useTerms(now)}
      today={now}
    />
  );
}
