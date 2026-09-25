import type { SeatGroupResult } from "@seatscout/client";
import {
  groupsOf,
  labelOf,
  whyOf,
  YOUR_SEATS_IN_THIS_ROOM,
} from "@seatscout/view-logic";
import type { ReactElement } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SLOP } from "../design-system/touch.js";
import { Type } from "../design-system/type.js";
import { useTheme } from "../theme.js";

const DRAWN = {
  height: 52,
  radius: 12,
  across: 13,
  down: 8,
  gap: 7,
  dot: { size: 20, ring: 2, fill: 0.42 },
  beside: 11,
} as const;

const styles = StyleSheet.create({
  list: { gap: DRAWN.gap },
  alternate: {
    alignItems: "center",
    borderRadius: DRAWN.radius,
    borderWidth: 1,
    flexDirection: "row",
    gap: DRAWN.beside,
    minHeight: DRAWN.height,
    minWidth: DRAWN.height,
    paddingHorizontal: DRAWN.across,
    paddingVertical: DRAWN.down,
  },
  dot: {
    alignItems: "center",
    borderRadius: DRAWN.dot.size,
    borderWidth: DRAWN.dot.ring,
    height: DRAWN.dot.size,
    justifyContent: "center",
    width: DRAWN.dot.size,
  },
  pip: {
    borderRadius: DRAWN.dot.size,
    height: DRAWN.dot.size * DRAWN.dot.fill,
    width: DRAWN.dot.size * DRAWN.dot.fill,
  },
  lines: { flexShrink: 1 },
});

export interface AlternatesProps {
  readonly listed: readonly SeatGroupResult[];
  readonly chosen: SeatGroupResult;
  readonly offered: number;
  readonly partySize: number;
  readonly onChoose: (group: SeatGroupResult) => void;
}

export const Alternates = ({
  listed,
  chosen,
  offered,
  partySize,
  onChoose,
}: AlternatesProps): ReactElement => {
  const { colours } = useTheme();

  return (
    <View style={styles.list} testID="alternates">
      <Type set="ledgerLabel" tone="silverFaint">
        {YOUR_SEATS_IN_THIS_ROOM}
      </Type>
      {listed.map((group) => {
        const on = group.key === chosen.key;
        return (
          <TouchableOpacity
            key={group.key}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            hitSlop={SLOP}
            onPress={() => onChoose(group)}
            style={[
              styles.alternate,
              {
                backgroundColor: colours.raised,
                borderColor: on ? colours.beam : colours.hairline,
              },
            ]}
          >
            <View
              style={[
                styles.dot,
                { borderColor: on ? colours.beam : colours.silverFaint },
              ]}
            >
              {on && (
                <View style={[styles.pip, { backgroundColor: colours.beam }]} />
              )}
            </View>
            <View style={styles.lines}>
              <Type set="ledger" tone="silver">
                {labelOf(group)}
              </Type>
              <Type set="sentenceSmall" tone="silverFaint">
                {whyOf(group.reasons, group.podDividers)}
              </Type>
            </View>
          </TouchableOpacity>
        );
      })}
      <Type set="sentenceSmall" tone="silverFaint">
        {groupsOf(offered, partySize)}
      </Type>
    </View>
  );
};
