import type { ReactElement } from "react";
import { Ask } from "../ask/ask.js";
import {
  keepAsItWas,
  runInstead,
  useFocus,
  useTerms,
} from "../host/address.js";
import { today } from "../host/clock.js";
import { useProfile } from "../host/profile.js";
import { seatProfile, seatscout } from "../host/source.js";

export default function AskRoute(): ReactElement | null {
  const now = today();
  const profile = useProfile(seatProfile);
  const focus = useFocus();
  const terms = useTerms(now);

  return profile === undefined ? null : (
    <Ask
      focus={focus}
      onFind={(asked, chosen) => {
        seatProfile.choose(chosen);
        runInstead(asked);
      }}
      onKeep={keepAsItWas}
      profile={profile}
      seatscout={seatscout}
      terms={terms}
      today={now}
    />
  );
}
