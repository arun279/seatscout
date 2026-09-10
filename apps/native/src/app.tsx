import type { ReactElement } from "react";
import { StyleSheet, Text, View } from "react-native";

const styles = StyleSheet.create({
  shell: { alignItems: "center", flex: 1, justifyContent: "center" },
});

export const App = (): ReactElement => (
  <View style={styles.shell}>
    <Text>SeatScout</Text>
  </View>
);
