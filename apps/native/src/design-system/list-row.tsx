import type { ReactElement, ReactNode } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme.js";
import { ON_ANDROID } from "./platform.js";
import { TOUCH_FLOOR } from "./touch.js";
import { Type } from "./type.js";

export interface ListRowProps {
  readonly label: string;
  readonly first: boolean;
  readonly last: boolean;
  readonly onPress: () => void;
  readonly children: ReactNode;
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minWidth: TOUCH_FLOOR,
  },
  ios: { minHeight: 60, paddingHorizontal: 14, paddingVertical: 8 },
  iosFirst: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  iosLast: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  android: {
    borderRadius: 4,
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  androidFirst: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  androidLast: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  androidApart: { marginTop: 2 },
  rule: { height: 1, left: 14, position: "absolute", right: 0, top: 0 },
  go: { fontSize: 16 },
});

const shapeOf = (first: boolean, last: boolean) =>
  ON_ANDROID
    ? [
        styles.android,
        first ? styles.androidFirst : styles.androidApart,
        last && styles.androidLast,
      ]
    : [styles.ios, first && styles.iosFirst, last && styles.iosLast];

export const ListRow = ({
  label,
  first,
  last,
  onPress,
  children,
}: ListRowProps): ReactElement => {
  const { colours } = useTheme();

  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.row,
        shapeOf(first, last),
        { backgroundColor: colours.raised },
      ]}
    >
      {!ON_ANDROID && !first && (
        <View
          style={[styles.rule, { backgroundColor: colours.hairline }]}
          testID="rule"
        />
      )}
      {children}
      {!ON_ANDROID && (
        <Type set="sentenceStrong" style={styles.go} tone="beam">
          ›
        </Type>
      )}
    </TouchableOpacity>
  );
};
