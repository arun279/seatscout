import { BACK_TO_THE_LIST } from "@seatscout/view-logic";
import type { ReactElement } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { SLOP, TOUCH_FLOOR } from "../design-system/touch.js";
import { Type } from "../design-system/type.js";

const styles = StyleSheet.create({
  back: {
    justifyContent: "center",
    minHeight: TOUCH_FLOOR,
    minWidth: TOUCH_FLOOR,
    paddingHorizontal: 18,
  },
});

export const Back = ({
  onBack,
}: {
  readonly onBack: () => void;
}): ReactElement => (
  <TouchableOpacity
    accessibilityRole="button"
    hitSlop={SLOP}
    onPress={onBack}
    style={styles.back}
  >
    <Type set="sentence" tone="beamDim">
      ‹ {BACK_TO_THE_LIST}
    </Type>
  </TouchableOpacity>
);
