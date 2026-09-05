import type { RecentSearch, SeatProfile } from "@seatscout/client";
import { useSyncExternalStore } from "react";
import { Ask } from "./ask.js";
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
  }
};

export const Overlays = ({
  stack,
  terms,
  profile,
  recent,
  today,
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
          onClose={onClose}
          onTerms={onTerms}
          onProfile={onProfile}
        />
      </div>
    ))}
  </>
);
