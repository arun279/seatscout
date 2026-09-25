import type { ReactElement } from "react";
import { Stage } from "../design-system/stage.js";
import { Type } from "../design-system/type.js";

export const HandOff = (): ReactElement => {
  return (
    <Stage>
      <Type set="marqueeTitle" tone="silver">
        Taking the seats
      </Type>
      <Type set="sentence" tone="silverDim">
        This sheet is a placeholder. Nothing is re-verified here yet and no
        ticketing page opens. Close it to go back to the list.
      </Type>
    </Stage>
  );
};
