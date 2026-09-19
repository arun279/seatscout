import { router } from "expo-router";
import type { ReactElement } from "react";
import { Ask } from "../ask/ask.js";
import { runInstead, useFocus, useTerms } from "../host/address.js";
import { today } from "../host/clock.js";
import { deviceSeatScout } from "../host/source.js";

const seatscout = deviceSeatScout();

export default function AskRoute(): ReactElement {
  const now = today();

  return (
    <Ask
      focus={useFocus()}
      onFind={runInstead}
      onKeep={() => router.back()}
      seatscout={seatscout}
      terms={useTerms(now)}
      today={now}
    />
  );
}
