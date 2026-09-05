import { useSyncExternalStore } from "react";
import { Ask } from "./ask.js";
import { Ledger } from "./coverage.js";
import type { HeldSnapshots } from "./held.js";
import type { Overlay } from "./overlay.js";
import type { Terms } from "./terms.js";

interface OverlaysProps {
  readonly overlay?: Overlay;
  readonly terms: Terms;
  readonly onClose: () => void;
  readonly onTerms: (terms: Terms) => void;
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

export const Overlays = ({
  overlay,
  terms,
  onClose,
  onTerms,
}: OverlaysProps) => {
  switch (overlay?.kind) {
    case "ask":
      return (
        <Ask
          terms={terms}
          focus={overlay.focus}
          onClose={onClose}
          onFind={onTerms}
        />
      );
    case "ledger":
      return <CurrentLedger held={overlay.held} onClose={onClose} />;
    default:
      return null;
  }
};
