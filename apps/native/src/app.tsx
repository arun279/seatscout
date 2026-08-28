import { StyleSheet, Text, View } from "react-native";

const styles = StyleSheet.create({
  shell: { alignItems: "center", flex: 1, justifyContent: "center" },
});

export const App = () => (
  <View style={styles.shell}>
    <Text>SeatScout</Text>
  </View>
);
