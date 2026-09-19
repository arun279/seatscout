import type { ReactElement } from "react";
import { Platform, StyleSheet, TouchableOpacity } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import type { Appearance, Palette } from "../theme.js";
import { useTheme } from "../theme.js";
import { TOUCH_FLOOR } from "./touch.js";
import { Type } from "./type.js";

export interface VelvetProps {
  readonly label: string;
  readonly onPress: () => void;
}

const labelTone = (appearance: Appearance): keyof Palette =>
  appearance === "down" ? "silver" : "raised";

const styles = StyleSheet.create({
  control: {
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    minWidth: TOUCH_FLOOR,
    paddingHorizontal: 16,
  },
});

const Curtain = ({
  colours,
  radius,
}: {
  readonly colours: Palette;
  readonly radius: number;
}) => (
  <Svg pointerEvents="none" style={StyleSheet.absoluteFill} testID="curtain">
    <Defs>
      <LinearGradient id="velvet" x1="0" x2="0" y1="0" y2="1">
        <Stop offset={0} stopColor={colours.velvet} />
        <Stop offset={1} stopColor={colours.velvetDeep} />
      </LinearGradient>
    </Defs>
    <Rect fill="url(#velvet)" height="100%" rx={radius} width="100%" />
  </Svg>
);

export const Velvet = ({ label, onPress }: VelvetProps): ReactElement => {
  const theme = useTheme();
  const lit = theme.appearance === "down";
  const radius =
    Platform.OS === "android" ? theme.radius.pill : theme.radius.control;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.control,
        {
          backgroundColor: theme.colours.velvet,
          borderColor: theme.colours.velvetDeep,
          borderRadius: radius,
          ...(lit && {
            boxShadow: `0 8px 26px ${theme.colours.velvetDeep}73`,
          }),
        },
      ]}
      testID="velvet"
    >
      {lit && <Curtain colours={theme.colours} radius={radius} />}
      <Type set="sentenceStrong" tone={labelTone(theme.appearance)}>
        {label}
      </Type>
    </TouchableOpacity>
  );
};
