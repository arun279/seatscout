import type { SeatGroupResult } from "@seatscout/client";
import { legendOf, type Mark } from "@seatscout/view-logic";
import type { ReactElement } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { Type } from "../design-system/type.js";
import { type Palette, useTheme } from "../theme.js";

const DRAWN = {
  swatch: 9,
  radius: 2,
  gap: { down: 7, across: 14 },
  beside: 5,
  glow: { blur: 6 },
  space: { stroke: 1 },
  tick: { stroke: 2 },
} as const;

const styles = StyleSheet.create({
  legend: {
    columnGap: DRAWN.gap.across,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: DRAWN.gap.down,
  },
  entry: { alignItems: "center", flexDirection: "row" },
  swatch: {
    borderRadius: DRAWN.radius,
    height: DRAWN.swatch,
    marginRight: DRAWN.beside,
    width: DRAWN.swatch,
  },
});

const swatchesOf = (
  colours: Palette,
  lit: boolean,
): Readonly<Record<Mark, ViewStyle>> => ({
  lit: {
    backgroundColor: colours.beam,
    ...(lit && { boxShadow: `0 0 ${DRAWN.glow.blur}px ${colours.beam}` }),
  },
  forSale: { backgroundColor: colours.seatFree },
  notBookable: {
    borderColor: colours.seatGone,
    borderWidth: DRAWN.space.stroke,
  },
  space: {
    borderColor: colours.beamDim,
    borderStyle: "dashed",
    borderWidth: DRAWN.space.stroke,
  },
  console: {
    borderLeftColor: colours.seatTick,
    borderLeftWidth: DRAWN.tick.stroke,
    borderRadius: 0,
    width: DRAWN.tick.stroke,
  },
});

export interface LegendProps {
  readonly chosen: SeatGroupResult;
  readonly accessibleSeating: boolean;
  readonly consoles: boolean;
}

export const Legend = ({
  chosen,
  accessibleSeating,
  consoles,
}: LegendProps): ReactElement => {
  const { appearance, colours } = useTheme();
  const swatches = swatchesOf(colours, appearance === "down");

  return (
    <View style={styles.legend} testID="legend">
      {legendOf(chosen, accessibleSeating, consoles).map((entry) => (
        <View key={entry.mark} style={styles.entry}>
          <View
            style={[styles.swatch, swatches[entry.mark]]}
            testID={`mark-${entry.mark}`}
          />
          <Type set="ledgerRow" tone="silverDim">
            {entry.words}
          </Type>
        </View>
      ))}
    </View>
  );
};
