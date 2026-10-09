import type { SearchTerms } from "@seatscout/client";
import { askedFrom } from "@seatscout/view-logic";
import { router, useLocalSearchParams } from "expo-router";
import type { ReactElement } from "react";
import { handOff, useTerms } from "../host/address.js";
import { deviceClock, today } from "../host/clock.js";
import { useOnline } from "../host/online.js";
import { useProfile } from "../host/profile.js";
import { seatProfile, seatscout } from "../host/source.js";
import { useOpenedRoom } from "../room/opening.js";
import { Reading } from "../room/reading.js";
import { Room } from "../room/room.js";

const clock = deviceClock();

const Opened = ({
  asked,
  date,
}: {
  readonly asked: SearchTerms;
  readonly date: string;
}): ReactElement => {
  const { showtime, group } = useLocalSearchParams<{
    readonly showtime?: string;
    readonly group?: string;
  }>();
  const online = useOnline();
  const { session, opened } = useOpenedRoom(seatscout, asked, showtime, group);

  if (opened === null)
    return (
      <Reading
        onLedger={() => router.push("/ledger")}
        session={session}
        today={date}
      />
    );

  return (
    <Room
      auditorium={opened.auditorium}
      clock={clock}
      online={online}
      onBack={router.back}
      onHandOff={handOff}
      opening={opened.opening}
      result={opened.result}
      today={date}
    />
  );
};

export default function RoomRoute(): ReactElement | null {
  const date = today();
  const terms = useTerms(date);
  const profile = useProfile(seatProfile);
  const asked = profile === undefined ? null : askedFrom(terms, profile, date);

  return asked === null ? null : <Opened asked={asked} date={date} />;
}
