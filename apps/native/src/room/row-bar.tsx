import type { AuditoriumMap, SeatRow } from "@seatscout/client";
import { rowTextOf } from "@seatscout/view-logic";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { Type } from "../design-system/type.js";
import { useTheme } from "../theme.js";

const DRAWN = { height: 56, radius: 12, across: 14, down: 9, gap: 8 } as const;

const styles = StyleSheet.create({
  bar: {
    alignItems: "center",
    borderRadius: DRAWN.radius,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: DRAWN.height,
    paddingHorizontal: DRAWN.across,
    paddingVertical: DRAWN.down,
  },
  label: { marginRight: DRAWN.gap },
  text: { flexShrink: 1 },
});

export interface RowBarProps {
  readonly row: SeatRow;
  readonly map: AuditoriumMap;
  readonly notice: string | null;
}

export const RowBar = ({ row, map, notice }: RowBarProps): ReactElement => {
  const { colours } = useTheme();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colours.raised,
          borderColor: notice === null ? colours.hairline : colours.velvet,
        },
      ]}
      testID="row-bar"
    >
      {notice === null ? (
        <>
          {row.label !== null && (
            <Type set="ledgerRow" style={styles.label} tone="beamDim">
              ROW {row.label}
            </Type>
          )}
          <Type set="sentence" style={styles.text} tone="silverDim">
            {rowTextOf(row, map)}
          </Type>
        </>
      ) : (
        <Type set="sentence" style={styles.text} tone="silver">
          {notice}
        </Type>
      )}
    </View>
  );
};
