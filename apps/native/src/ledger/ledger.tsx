import type { ReactElement } from "react";
import { Stage } from "../design-system/stage.js";
import { Type } from "../design-system/type.js";

export const Ledger = (): ReactElement => {
  return (
    <Stage>
      <Type set="marqueeTitle" tone="silver">
        Every showtime, accounted for
      </Type>
      <Type set="sentence" tone="silverDim">
        This sheet is a placeholder. Every outcome and its own remedy are not
        counted here yet. Close it to go back to the list.
      </Type>
    </Stage>
  );
};
