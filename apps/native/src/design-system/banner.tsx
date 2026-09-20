import { OFFLINE } from "@seatscout/view-logic";
import type { ReactElement } from "react";
import { AccessibilityInfo, Platform, StyleSheet, View } from "react-native";
import { useTheme } from "../theme.js";
import { Type } from "./type.js";

const styles = StyleSheet.create({
  banner: {
    alignItems: "flex-start",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 9,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  dot: { borderRadius: 4, height: 7, marginTop: 5, width: 7 },
  said: { flexShrink: 1 },
});

const announcedOnceDrawn = (drawn: View | null): void => {
  if (drawn !== null && Platform.OS !== "android")
    AccessibilityInfo.announceForAccessibility(OFFLINE);
};

export const Banner = (): ReactElement => {
  const theme = useTheme();

  return (
    <View
      ref={announcedOnceDrawn}
      testID="offline-banner"
      style={[
        styles.banner,
        {
          backgroundColor: theme.colours.high,
          borderTopColor: theme.colours.hairline,
        },
      ]}
    >
      <View
        style={[styles.dot, { backgroundColor: theme.colours.velvetLit }]}
        testID="offline-dot"
      />
      <Type
        aria-live="polite"
        role="status"
        set="sentenceSmall"
        style={styles.said}
        tone="silverDim"
      >
        {OFFLINE}
      </Type>
    </View>
  );
};
