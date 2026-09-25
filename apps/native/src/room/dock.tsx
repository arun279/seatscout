import type { SeatGroupResult } from "@seatscout/client";
import {
  heldWhileOfflineOf,
  labelOf,
  RE_CHECKED_ON_THE_TAP,
  WAITS_FOR_THE_CONNECTION,
} from "@seatscout/view-logic";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { Velvet } from "../design-system/button.js";
import { Type } from "../design-system/type.js";
import { useTheme } from "../theme.js";

const DRAWN = { gap: 8, across: 18, top: 12, bottom: 2 } as const;

const styles = StyleSheet.create({
  dock: {
    borderTopWidth: 1,
    gap: DRAWN.gap,
    paddingBottom: DRAWN.bottom,
    paddingHorizontal: DRAWN.across,
    paddingTop: DRAWN.top,
  },
  centred: { textAlign: "center" },
});

export interface DockProps {
  readonly chosen: SeatGroupResult;
  readonly online: boolean;
  readonly onHandOff: (chosen: SeatGroupResult) => void;
}

export const Dock = ({
  chosen,
  online,
  onHandOff,
}: DockProps): ReactElement => {
  const { colours } = useTheme();

  return (
    <View
      style={[
        styles.dock,
        {
          backgroundColor: colours.house,
          borderTopColor: colours.hairline,
        },
      ]}
      testID="dock"
    >
      {online ? (
        <>
          <Type set="sentenceSmall" style={styles.centred} tone="silverDim">
            {RE_CHECKED_ON_THE_TAP}
          </Type>
          <Velvet label={labelOf(chosen)} onPress={() => onHandOff(chosen)} />
        </>
      ) : (
        <>
          <Type set="sentence" style={styles.centred} tone="silver">
            {heldWhileOfflineOf(chosen)}
          </Type>
          <Type set="sentenceSmall" style={styles.centred} tone="silverFaint">
            {WAITS_FOR_THE_CONNECTION}
          </Type>
        </>
      )}
    </View>
  );
};
