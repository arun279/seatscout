import type { ReactElement, ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme.js";

const styles = StyleSheet.create({ stage: { flex: 1, gap: 9, padding: 18 } });

export const Stage = ({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement => {
  const theme = useTheme();

  return (
    <View
      style={[styles.stage, { backgroundColor: theme.colours.house }]}
      testID="stage"
    >
      {children}
    </View>
  );
};
