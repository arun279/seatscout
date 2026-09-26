import { toggled } from "@seatscout/view-logic";
import type { ReactElement } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme.js";
import { ON_ANDROID } from "./platform.js";
import { TOUCH_FLOOR } from "./touch.js";
import { Type } from "./type.js";

export interface Chip<Named extends string> {
  readonly value: Named;
  readonly text: string;
}

export interface ChipsProps<Named extends string> {
  readonly chips: readonly Chip<Named>[];
  readonly chosen: readonly Named[] | undefined;
  readonly onChosen: (chosen: readonly Named[]) => void;
}

const styles = StyleSheet.create({
  group: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: TOUCH_FLOOR,
    minWidth: TOUCH_FLOOR,
    paddingHorizontal: 15,
  },
  square: { borderRadius: 12 },
  filter: { borderRadius: 8 },
});

export const Chips = <Named extends string>({
  chips,
  chosen,
  onChosen,
}: ChipsProps<Named>): ReactElement => {
  const { colours } = useTheme();
  const every = chips.map((chip) => chip.value);

  return (
    <View style={styles.group}>
      {chips.map(({ value, text }) => {
        const pressed = chosen?.includes(value) === true;
        return (
          <TouchableOpacity
            accessibilityLabel={text}
            accessibilityRole="button"
            accessibilityState={{ selected: pressed }}
            key={value}
            onPress={() => onChosen(toggled(every, chosen, value))}
            style={[
              styles.chip,
              ON_ANDROID ? styles.filter : styles.square,
              pressed
                ? {
                    backgroundColor: colours.chosen,
                    borderColor: colours.chosen,
                  }
                : {
                    backgroundColor: colours.raised,
                    borderColor: colours.silverFaint,
                  },
            ]}
          >
            {pressed && ON_ANDROID && (
              <Type set="sentence" tone="onChosen">
                ✓
              </Type>
            )}
            <Type set="sentence" tone={pressed ? "onChosen" : "silver"}>
              {text}
            </Type>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
