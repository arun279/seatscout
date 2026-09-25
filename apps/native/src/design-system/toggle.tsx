import type { ReactElement } from "react";
import { StyleSheet, Switch, View } from "react-native";
import { useTheme } from "../theme.js";
import { TOUCH_FLOOR } from "./touch.js";
import { Type } from "./type.js";

export interface ToggleProps {
  readonly label: string;
  readonly said: string;
  readonly on: boolean;
  readonly onToggle: (on: boolean) => void;
}

const styles = StyleSheet.create({
  toggle: { gap: 4, paddingHorizontal: 18, paddingTop: 14 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: TOUCH_FLOOR,
  },
});

export const Toggle = ({
  label,
  said,
  on,
  onToggle,
}: ToggleProps): ReactElement => {
  const { colours } = useTheme();

  return (
    <View style={styles.toggle}>
      <View style={styles.row} testID="toggle-row">
        <Type set="sentenceLead" tone="silver">
          {label}
        </Type>
        <Switch
          accessibilityLabel={label}
          accessibilityState={{ checked: on }}
          onValueChange={onToggle}
          trackColor={{ false: colours.high, true: colours.velvet }}
          value={on}
        />
      </View>
      <Type set="sentenceSmall" tone="silverFaint">
        {said}
      </Type>
    </View>
  );
};
