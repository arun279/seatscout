import type { RecentSearch, SeatProfile, SeatScout } from "@seatscout/client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { App, type Clock } from "./app.js";
import type { Address } from "./browser.js";
import { twoDigits } from "./phrases.js";
import { queryOf, type Terms, termsFrom } from "./terms.js";

export interface Remembered {
  readonly profile: SeatProfile;
  readonly recent: readonly RecentSearch[];
}

interface RootProps {
  readonly seatscout: SeatScout;
  readonly address: Address;
  readonly clock: Clock;
  readonly remembered: Remembered;
}

const localDate = (at: number) => {
  const date = new Date(at);
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
};

export const rememberedBy = async (
  seatscout: SeatScout,
): Promise<Remembered> => {
  const [profile, recent] = await Promise.all([
    seatscout.profile.remembered(),
    seatscout.recent.remembered(),
  ]);
  return { profile, recent };
};

export const Root = ({ seatscout, address, clock, remembered }: RootProps) => {
  const query = useSyncExternalStore(address.subscribe, address.query);
  const today = localDate(useSyncExternalStore(clock.subscribe, clock.now));
  const [profile, setProfile] = useState(remembered.profile);
  const [recent, setRecent] = useState(remembered.recent);
  const terms = termsFrom(query, today);

  useEffect(() => {
    const { movie, date, area, partySize } = termsFrom(query, today);
    if (movie === undefined || area === undefined) return;
    void seatscout.recent
      .remember({ movie, date, area, partySize })
      .then(setRecent);
  }, [query, today, seatscout]);

  return (
    <App
      seatscout={seatscout}
      terms={terms}
      onTerms={(next: Terms) => {
        const asked = queryOf(next);
        if (asked !== queryOf(terms)) address.go(asked);
      }}
      profile={profile}
      onProfile={(next) => {
        setProfile(next);
        void seatscout.profile.remember(next);
      }}
      recent={recent}
      today={today}
      clock={clock}
    />
  );
};
