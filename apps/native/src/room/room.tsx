import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { Type } from "../design-system/type.js";
import { useTheme } from "../theme.js";

const styles = StyleSheet.create({
  room: { flex: 1, gap: 9, padding: 18 },
});

export const Room = (): ReactElement => {
  const theme = useTheme();

  return (
    <View
      style={[styles.room, { backgroundColor: theme.colours.house }]}
      testID="stage"
    >
      <Type set="marqueeTitle" tone="silver">
        The room
      </Type>
      <Type set="sentence" tone="silverDim">
        The Auditorium is drawn here, and this screen is a placeholder that
        holds none of it yet. Go back to the list.
      </Type>
    </View>
  );
};
