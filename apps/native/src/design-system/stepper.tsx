import type { ReactElement } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme.js";
import { ON_ANDROID } from "./platform.js";
import { Type } from "./type.js";

export interface StepperProps {
  readonly count: number;
  readonly least: number;
  readonly fewer: string;
  readonly more: string;
  readonly onCount: (count: number) => void;
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: 12 },
  step: {
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 48,
  },
  square: { borderRadius: 12 },
  round: { borderRadius: 24 },
  count: { minWidth: 40, textAlign: "center" },
});

export const Stepper = ({
  count,
  least,
  fewer,
  more,
  onCount,
}: StepperProps): ReactElement => {
  const theme = useTheme();
  const step = [
    styles.step,
    ON_ANDROID ? styles.round : styles.square,
    {
      backgroundColor: theme.colours.raised,
      borderColor: theme.colours.hairline,
    },
  ];

  return (
    <View style={styles.row}>
      <TouchableOpacity
        accessibilityLabel={fewer}
        accessibilityRole="button"
        onPress={() => onCount(Math.max(least, count - 1))}
        style={step}
      >
        <Type set="sentenceStrong" tone="silver">
          −
        </Type>
      </TouchableOpacity>
      <Type set="marqueeHero" style={styles.count} tone="silver">
        {`${count}`}
      </Type>
      <TouchableOpacity
        accessibilityLabel={more}
        accessibilityRole="button"
        onPress={() => onCount(count + 1)}
        style={step}
      >
        <Type set="sentenceStrong" tone="silver">
          +
        </Type>
      </TouchableOpacity>
    </View>
  );
};
