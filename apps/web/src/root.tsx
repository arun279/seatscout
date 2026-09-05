import type { SeatScout } from "@seatscout/client";
import { useSyncExternalStore } from "react";
import { App, type Clock } from "./app.js";
import type { Address } from "./browser.js";
import { twoDigits } from "./phrases.js";
import { queryOf, type Terms, termsFrom } from "./terms.js";

interface RootProps {
  readonly seatscout: SeatScout;
  readonly address: Address;
  readonly clock: Clock;
}

const localDate = (at: number) => {
  const date = new Date(at);
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
};

export const Root = ({ seatscout, address, clock }: RootProps) => {
  const query = useSyncExternalStore(address.subscribe, address.query);
  const today = localDate(clock.now());
  return (
    <App
      seatscout={seatscout}
      terms={termsFrom(query, today)}
      onTerms={(next: Terms) => address.go(queryOf(next))}
      today={today}
      clock={clock}
    />
  );
};
