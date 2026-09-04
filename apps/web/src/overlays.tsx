import type {
  RecentSearch,
  SeatGroupResult,
  SeatProfile,
  Verified,
} from "@seatscout/client";
import { useSyncExternalStore } from "react";
import type { Clock } from "./app.js";
import { Ask } from "./ask.js";
import { Auditorium } from "./auditorium.js";
import { Ledger } from "./coverage.js";
import type { HeldSnapshots } from "./held.js";
import type { Overlay } from "./overlay.js";
import type { Terms } from "./terms.js";

interface OverlaysProps {
  readonly stack: readonly Overlay[];
  readonly terms: Terms;
  readonly profile: SeatProfile;
  readonly recent: readonly RecentSearch[];
  readonly today: string;
  readonly clock: Clock;
  readonly onClose: () => void;
  readonly onTerms: (terms: Terms) => void;
  readonly onProfile: (profile: SeatProfile) => void;
  readonly onHandOff: (candidate: SeatGroupResult) => Promise<Verified>;
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
  onClose,
  onHandOff,
}: {
  readonly overlay: Extract<Overlay, { kind: "room" }>;
  readonly today: string;
  readonly clock: Clock;
  readonly onClose: () => void;
  readonly onHandOff: (candidate: SeatGroupResult) => Promise<Verified>;
}) => (
  <Auditorium
    result={overlay.result}
    search={overlay.search}
    today={today}
    now={useSyncExternalStore(clock.subscribe, clock.now)}
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
          onClose={onClose}
          onHandOff={onHandOff}
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
