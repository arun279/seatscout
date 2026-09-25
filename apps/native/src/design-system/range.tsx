import Slider from "@react-native-community/slider";
import type { Scale } from "@seatscout/view-logic";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme.js";
import { TOUCH_FLOOR } from "./touch.js";
import { Type } from "./type.js";

export interface RangeProps {
  readonly label: string;
  readonly said: string;
  readonly ends?: readonly [string, string] | undefined;
  readonly scale: Scale;
  readonly value: number;
  readonly onChange: (value: number) => void;
}

const styles = StyleSheet.create({
  range: { gap: 2 },
  named: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slider: { height: TOUCH_FLOOR },
  ends: { flexDirection: "row", justifyContent: "space-between" },
});

const hundredths = (value: number) => Math.round(value * 100) / 100;

const reachable = (value: number) => (value === 0 ? Number.EPSILON : value);

export const Range = ({
  label,
  said,
  ends,
  scale,
  value,
  onChange,
}: RangeProps): ReactElement => {
  const { colours } = useTheme();

  return (
    <View style={styles.range}>
      <View style={styles.named}>
        <Type set="sentenceLead" tone="silver">
          {label}
        </Type>
        <Type set="ledgerRow" tone="beamDim">
          {said}
        </Type>
      </View>
      <Slider
        accessibilityLabel={label}
        accessibilityRole="adjustable"
        accessibilityValue={{ text: said }}
        maximumTrackTintColor={colours.high}
        maximumValue={scale.max}
        minimumTrackTintColor={colours.beam}
        minimumValue={scale.min}
        onValueChange={(slid) => onChange(hundredths(slid))}
        step={scale.step}
        style={styles.slider}
        thumbTintColor={colours.silver}
        value={reachable(value)}
      />
      {ends !== undefined && (
        <View style={styles.ends}>
          <Type set="ledgerLabel" tone="silverFaint">
            {ends[0]}
          </Type>
          <Type set="ledgerLabel" tone="silverFaint">
            {ends[1]}
          </Type>
        </View>
      )}
    </View>
  );
};
