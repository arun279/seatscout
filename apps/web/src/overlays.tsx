import type {
  RecentSearch,
  SeatGroupResult,
  SeatProfile,
  SeatScout,
} from "@seatscout/client";
import { useSyncExternalStore } from "react";
import type { Checkout, Clock } from "./app.js";
import { Ask } from "./ask.js";
import { Room } from "./auditorium.js";
import { Ledger } from "./coverage.js";
import { HandOff } from "./hand-off.js";
import type { HeldSnapshots } from "./held.js";
import type { Overlay } from "./overlay.js";
import type { HeldProgramme } from "./programme.js";
import type { Terms } from "./terms.js";

interface OverlaysProps {
  readonly stack: readonly Overlay[];
  readonly terms: Terms;
  readonly profile: SeatProfile;
  readonly recent: readonly RecentSearch[];
  readonly today: string;
  readonly clock: Clock;
  readonly online: boolean;
  readonly verify: SeatScout["verify"];
  readonly checkout: Checkout;
  readonly programme: HeldProgramme;
  readonly onProgramme: (
    area: string | undefined,
    date: string,
  ) => HeldProgramme;
  readonly onClose: () => void;
  readonly onTerms: (terms: Terms) => void;
  readonly onProfile: (profile: SeatProfile) => void;
  readonly onHandOff: (candidate: SeatGroupResult) => void;
}

const CurrentLedger = ({
  held,
  onClose,
}: {
  readonly held: HeldSnapshots;
  readonly onClose: () => void;
}) => (
  <Ledger
    snapshot={useSyncExternalStore(held.subscribe, held.snapshot)}
    onClose={onClose}
  />
);

const CurrentRoom = ({
  overlay,
  today,
  clock,
  online,
  onClose,
  onHandOff,
}: {
  readonly overlay: Extract<Overlay, { kind: "room" }>;
  readonly today: string;
  readonly clock: Clock;
  readonly online: boolean;
  readonly onClose: () => void;
  readonly onHandOff: (candidate: SeatGroupResult) => void;
}) => (
  <Room
    result={overlay.result}
    search={overlay.search}
    today={today}
    now={useSyncExternalStore(clock.subscribe, clock.now)}
    online={online}
    onClose={onClose}
    onHandOff={onHandOff}
  />
);

const Current = ({
  overlay,
  terms,
  profile,
  recent,
  today,
  clock,
  online,
  verify,
  checkout,
  programme,
  onProgramme,
  onClose,
  onTerms,
  onProfile,
  onHandOff,
}: Omit<OverlaysProps, "stack"> & { readonly overlay: Overlay }) => {
  switch (overlay.kind) {
    case "ask":
      return (
        <Ask
          terms={terms}
          profile={profile}
          recent={recent}
          today={today}
          programme={programme}
          onProgramme={onProgramme}
          focus={overlay.focus}
          onClose={onClose}
          onFind={(next, chosen) => {
            onTerms(next);
            onProfile(chosen);
          }}
        />
      );
    case "ledger":
      return <CurrentLedger held={overlay.held} onClose={onClose} />;
    case "room":
      return (
        <CurrentRoom
          overlay={overlay}
          today={today}
          clock={clock}
          online={online}
          onClose={onClose}
          onHandOff={onHandOff}
        />
      );
    case "handOff":
      return (
        <HandOff
          candidate={overlay.candidate}
          verify={verify}
          checkout={checkout}
          clock={clock}
          today={today}
          onClose={onClose}
        />
      );
  }
};

export const Overlays = ({ stack, ...rest }: OverlaysProps) => (
  <>
    {stack.map((overlay, at) => (
      <div key={String(at)}>
        <Current overlay={overlay} {...rest} />
      </div>
    ))}
  </>
);
