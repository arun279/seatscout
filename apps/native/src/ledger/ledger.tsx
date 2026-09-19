import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { Type } from "../design-system/type.js";
import { useTheme } from "../theme.js";

const styles = StyleSheet.create({
  sheet: { flex: 1, gap: 9, padding: 18 },
});

export const Ledger = (): ReactElement => {
  const theme = useTheme();

  return (
    <View
      style={[styles.sheet, { backgroundColor: theme.colours.house }]}
      testID="stage"
    >
      <Type set="marqueeTitle" tone="silver">
        Every showtime, accounted for
      </Type>
      <Type set="sentence" tone="silverDim">
        This sheet is a placeholder. Every outcome and its own remedy are not
        counted here yet. Close it to go back to the list.
      </Type>
    </View>
  );
};
