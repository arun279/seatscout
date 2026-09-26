import type { ReactElement } from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import type { Appearance, Palette, Theme } from "../theme.js";
import { useTheme } from "../theme.js";
import { committed } from "./feedback.js";
import { TOUCH_FLOOR } from "./touch.js";
import { Type } from "./type.js";

export interface VelvetProps {
  readonly label: string;
  readonly onPress: () => void;
}

const labelTone = (appearance: Appearance): keyof Palette =>
  appearance === "down" ? "silver" : "raised";

export interface GhostProps {
  readonly label: string;
  readonly onPress?: (() => void) | undefined;
}

const styles = StyleSheet.create({
  control: {
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    minWidth: TOUCH_FLOOR,
    paddingHorizontal: 16,
  },
  ghost: {
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
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

const radiusOf = (radius: Theme["radius"]) =>
  Platform.OS === "android" ? radius.pill : radius.control;

export const Velvet = ({ label, onPress }: VelvetProps): ReactElement => {
  const theme = useTheme();
  const lit = theme.appearance === "down";
  const radius = radiusOf(theme.radius);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={committed(onPress)}
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

export const Ghost = ({ label, onPress }: GhostProps): ReactElement => {
  const theme = useTheme();
  const drawn = [
    styles.ghost,
    {
      borderColor: theme.colours.hairline,
      borderRadius: radiusOf(theme.radius),
    },
  ];
  const said = (
    <Type set="sentence" tone="silverDim">
      {label}
    </Type>
  );

  return onPress === undefined ? (
    <View style={drawn} testID="waiting">
      {said}
    </View>
  ) : (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={drawn}
      testID="ghost"
    >
      {said}
    </TouchableOpacity>
  );
};
