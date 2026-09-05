import { useSyncExternalStore } from "react";
import { Ask } from "./ask.js";
import { Ledger } from "./coverage.js";
import type { HeldSnapshots } from "./held.js";
import type { Overlay } from "./overlay.js";
import type { Terms } from "./terms.js";

interface OverlaysProps {
  readonly stack: readonly Overlay[];
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

const Current = ({
  overlay,
  terms,
  onClose,
  onTerms,
}: Omit<OverlaysProps, "stack"> & { readonly overlay: Overlay }) => {
  switch (overlay.kind) {
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
  }
};

export const Overlays = ({ stack, terms, onClose, onTerms }: OverlaysProps) => (
  <>
    {stack.map((overlay, at) => (
      <div key={String(at)}>
        <Current
          overlay={overlay}
          terms={terms}
          onClose={onClose}
          onTerms={onTerms}
        />
      </div>
    ))}
  </>
);
