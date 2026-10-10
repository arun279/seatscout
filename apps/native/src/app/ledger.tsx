import { askedFrom } from "@seatscout/view-logic";
import { Redirect, router } from "expo-router";
import type { ReactElement } from "react";
import { useTerms } from "../host/address.js";
import { today } from "../host/clock.js";
import { useOnline } from "../host/online.js";
import { useProfile } from "../host/profile.js";
import { seatProfile, seatScout } from "../host/source.js";
import { Ledger } from "../ledger/ledger.js";

export default function LedgerRoute(): ReactElement | null {
  const date = today();
  const terms = useTerms(date);
  const online = useOnline();
  const profile = useProfile(seatProfile());

  if (profile === undefined) return null;
  const asked = askedFrom(terms, profile, date);

  return asked === null ? (
    <Redirect href="/" />
  ) : (
    <Ledger
      asked={asked}
      onClose={router.back}
      online={online}
      seatscout={seatScout()}
    />
  );
}
