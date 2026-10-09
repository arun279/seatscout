import type { SearchTerms } from "@seatscout/client";
import { useLocalSearchParams } from "expo-router";
import type { ReactElement } from "react";
import { handOff } from "../host/address.js";
import { deviceClock } from "../host/clock.js";
import { useOnline } from "../host/online.js";
import { seatscout } from "../host/source.js";
import { useOpenedRoom } from "./opening.js";
import { Room } from "./room.js";

const clock = deviceClock();

export interface OpenedProps {
  readonly asked: SearchTerms;
  readonly date: string;
  readonly onBack?: (() => void) | undefined;
}

export const Opened = ({
  asked,
  date,
  onBack,
}: OpenedProps): ReactElement | null => {
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
      key={`${showtime}|${group}`}
      online={online}
      onBack={onBack}
      onHandOff={handOff}
      opening={opened.opening}
      result={opened.result}
      today={date}
    />
  );
};
