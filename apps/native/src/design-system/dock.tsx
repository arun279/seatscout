import type { ReactElement, ReactNode } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme.js";

const styles = StyleSheet.create({
  dock: {
    borderTopWidth: 1,
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
});

export const Dock = ({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement => {
  const { colours } = useTheme();

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={[
        styles.dock,
        { backgroundColor: colours.house, borderTopColor: colours.hairline },
      ]}
      testID="dock"
    >
      {children}
    </SafeAreaView>
  );
};
