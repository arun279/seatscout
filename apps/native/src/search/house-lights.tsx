import type { HouseLights } from "@seatscout/client";
import { HOUSE_LIGHTS, lightsSaidOf } from "@seatscout/view-logic";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { Segments } from "../design-system/segments.js";
import { Type } from "../design-system/type.js";
import { useTheme } from "../theme.js";

export interface HouseLightsProps {
  readonly chosen: HouseLights;
  readonly onChosen: (lights: HouseLights) => void;
}

const styles = StyleSheet.create({
  lights: { gap: 8, paddingHorizontal: 18, paddingVertical: 22 },
});

export const HouseLightsControl = ({
  chosen,
  onChosen,
}: HouseLightsProps): ReactElement => (
  <View style={styles.lights}>
    <Type set="ledgerLabel" tone="silverFaint">
      {HOUSE_LIGHTS.label}
    </Type>
    <Segments
      chosen={chosen}
      onChosen={onChosen}
      segments={HOUSE_LIGHTS.choices}
    />
    <Type set="ledgerRow" tone="beamDim">
      {lightsSaidOf(chosen, useTheme().appearance)}
    </Type>
    <Type set="sentenceSmall" tone="silverFaint">
      {HOUSE_LIGHTS.note}
    </Type>
  </View>
);
