import type { ReactElement } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { useTheme } from "../theme.js";
import { felt } from "./feedback.js";
import { SECTION } from "./field.js";
import { TOUCH_FLOOR } from "./touch.js";
import { Type } from "./type.js";

export interface ToggleProps {
  readonly label: string;
  readonly note: string;
  readonly on: boolean;
  readonly onToggle: (on: boolean) => void;
}

const styles = StyleSheet.create({
  toggle: { gap: 4 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: TOUCH_FLOOR,
    minWidth: TOUCH_FLOOR,
  },
});

export const Toggle = ({
  label,
  note,
  on,
  onToggle,
}: ToggleProps): ReactElement => {
  const { colours } = useTheme();
  const flip = felt(onToggle);

  return (
    <View style={[SECTION, styles.toggle]}>
      <Pressable
        accessible={false}
        onPress={() => flip(!on)}
        style={styles.row}
        testID="toggle-row"
      >
        <Type set="sentenceLead" tone="silver">
          {label}
        </Type>
        <Switch
          accessibilityLabel={label}
          accessibilityState={{ checked: on }}
          accessible
          onValueChange={flip}
          testID="toggle-switch"
          trackColor={{ false: colours.high, true: colours.velvet }}
          value={on}
        />
      </Pressable>
      <Type set="sentenceSmall" tone="silverFaint">
        {note}
      </Type>
    </View>
  );
};
