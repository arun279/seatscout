import { useState } from "react";
import type { Term } from "./title-card-terms.js";

export type Overlay =
  | { readonly kind: "ask"; readonly focus: Term }
  | { readonly kind: "ledger" };

export interface Overlays {
  readonly stack: readonly Overlay[];
  readonly open: (overlay: Overlay) => void;
  readonly close: () => void;
}

export const useOverlays = (): Overlays => {
  const [stack, setStack] = useState<readonly Overlay[]>([]);
  return {
    stack,
    open: (overlay) => setStack((current) => [...current, overlay]),
    close: () => setStack((current) => current.slice(0, -1)),
  };
};
