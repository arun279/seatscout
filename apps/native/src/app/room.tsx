import { askedFrom } from "@seatscout/view-logic";
import { router } from "expo-router";
import type { ReactElement } from "react";
import { useTerms } from "../host/address.js";
import { today } from "../host/clock.js";
import { useProfile } from "../host/profile.js";
import { seatProfile } from "../host/source.js";
import { Opened } from "../room/opened.js";

export default function RoomRoute(): ReactElement | null {
  const date = today();
  const terms = useTerms(date);
  const profile = useProfile(seatProfile);
  const asked = profile === undefined ? null : askedFrom(terms, profile, date);

  return asked === null ? null : (
    <Opened asked={asked} date={date} onBack={router.back} />
  );
}
