import { Redirect, router } from "expo-router";
import type { ReactElement } from "react";
import { HandOff } from "../hand-off/hand-off.js";
import { useHanded } from "../host/address.js";
import { inAppBrowser } from "../host/checkout.js";
import { deviceClock, today } from "../host/clock.js";
import { useOnline } from "../host/online.js";
import { seatscout } from "../host/source.js";

const clock = deviceClock();

export default function HandOffRoute(): ReactElement {
  const chosen = useHanded();
  const online = useOnline();

  return chosen === undefined ? (
    <Redirect href="/" />
  ) : (
    <HandOff
      checkout={inAppBrowser}
      chosen={chosen}
      key={chosen.key}
      clock={clock}
      onClose={router.back}
      online={online}
      today={today()}
      verify={seatscout.verify}
    />
  );
}
