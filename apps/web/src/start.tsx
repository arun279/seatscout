import type { SeatScout } from "@seatscout/client";
import { useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { App, type Clock } from "./app.js";
import {
  type Address,
  browserAddress,
  browserClock,
  browserSeatScout,
} from "./browser.js";
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

const Root = ({ seatscout, address, clock }: RootProps) => {
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

export const startApp = () => {
  const mount = document.getElementById("app");
  if (mount === null) throw new Error("the page has nothing to mount into");
  createRoot(mount).render(
    <Root
      seatscout={browserSeatScout()}
      address={browserAddress()}
      clock={browserClock()}
    />,
  );
};
