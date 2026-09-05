import type { RecentSearch, SeatProfile, SeatScout } from "@seatscout/client";
import { useSyncExternalStore } from "react";
import type { Checkout, Clock } from "./app.js";
import { Ask } from "./ask.js";
import { Ledger } from "./coverage.js";
import { HandOff } from "./hand-off.js";
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
  readonly verify: SeatScout["verify"];
  readonly checkout: Checkout;
  readonly onClose: () => void;
  readonly onTerms: (terms: Terms) => void;
  readonly onProfile: (profile: SeatProfile) => void;
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

const Current = ({
  overlay,
  terms,
  profile,
  recent,
  today,
  clock,
  verify,
  checkout,
  onClose,
  onTerms,
  onProfile,
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

export const Overlays = ({
  stack,
  terms,
  profile,
  recent,
  today,
  clock,
  verify,
  checkout,
  onClose,
  onTerms,
  onProfile,
}: OverlaysProps) => (
  <>
    {stack.map((overlay, at) => (
      <div key={String(at)}>
        <Current
          overlay={overlay}
          terms={terms}
          profile={profile}
          recent={recent}
          today={today}
          clock={clock}
          verify={verify}
          checkout={checkout}
          onClose={onClose}
          onTerms={onTerms}
          onProfile={onProfile}
        />
      </div>
    ))}
  </>
);
