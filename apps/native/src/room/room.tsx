import type { ReactElement } from "react";
import { Stage } from "../design-system/stage.js";
import { Type } from "../design-system/type.js";

export const Room = (): ReactElement => {
  return (
    <Stage>
      <Type set="marqueeTitle" tone="silver">
        The room
      </Type>
      <Type set="sentence" tone="silverDim">
        The Auditorium is drawn here, and this screen is a placeholder that
        holds none of it yet. Go back to the list.
      </Type>
    </Stage>
  );
};
