import { REFERENCE, type SearchTerms } from "@seatscout/client";
import { askedFrom } from "@seatscout/view-logic";
import { router, useLocalSearchParams } from "expo-router";
import type { ReactElement } from "react";
import { handOff, useTerms } from "../host/address.js";
import { clock, today } from "../host/clock.js";
import { useOnline } from "../host/online.js";
import { seatscout } from "../host/source.js";
import { useOpenedRoom } from "../room/opening.js";
import { Room } from "../room/room.js";

const Opened = ({
  asked,
  date,
}: {
  readonly asked: SearchTerms;
  readonly date: string;
}): ReactElement | null => {
  const { showtime, group } = useLocalSearchParams<{
    readonly showtime?: string;
    readonly group?: string;
  }>();
  const online = useOnline();
  const opened = useOpenedRoom(seatscout, asked, showtime, group);

  if (opened === null) return null;

  return (
    <Room
      auditorium={opened.auditorium}
      clock={clock}
      online={online}
      onBack={router.back}
      onHandOff={(chosen) => handOff(chosen.key)}
      opening={opened.opening}
      result={opened.result}
      today={date}
    />
  );
};

export default function RoomRoute(): ReactElement | null {
  const date = today();
  const asked = askedFrom(useTerms(date), REFERENCE);

  return asked === null ? null : <Opened asked={asked} date={date} />;
}
