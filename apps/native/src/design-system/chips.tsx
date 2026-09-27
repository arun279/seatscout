import { toggled } from "@seatscout/view-logic";
import type { ReactElement } from "react";
import {
  type AccessibilityRole,
  type AccessibilityState,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../theme.js";
import { felt } from "./feedback.js";
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

interface Choice<Value> {
  readonly key: string;
  readonly text: string;
  readonly sub: string;
  readonly value: Value;
}

export interface ChoicesProps<Value> {
  readonly choices: readonly Choice<Value>[];
  readonly chosen: string;
  readonly onChoose: (value: Value) => void;
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

interface FaceProps {
  readonly on: boolean;
  readonly text: string;
  readonly sub?: string | undefined;
  readonly role: AccessibilityRole;
  readonly state: AccessibilityState;
  readonly onPress: () => void;
}

const Face = ({ on, text, sub, role, state, onPress }: FaceProps) => {
  const { colours } = useTheme();

  return (
    <TouchableOpacity
      accessibilityLabel={sub === undefined ? text : `${text}, ${sub}`}
      accessibilityRole={role}
      accessibilityState={state}
      onPress={felt(onPress)}
      style={[
        styles.chip,
        ON_ANDROID ? styles.filter : styles.square,
        on
          ? { backgroundColor: colours.chosen, borderColor: colours.chosen }
          : {
              backgroundColor: colours.raised,
              borderColor: colours.silverFaint,
            },
      ]}
    >
      {on && ON_ANDROID && (
        <Type set="sentence" tone="onChosen">
          ✓
        </Type>
      )}
      <Type set="sentence" tone={on ? "onChosen" : "silver"}>
        {text}
      </Type>
      {sub !== undefined && (
        <Type set="sentenceSmall" tone={on ? "onChosen" : "silverDim"}>
          {sub}
        </Type>
      )}
    </TouchableOpacity>
  );
};

export const Chips = <Named extends string>({
  chips,
  chosen,
  onChosen,
}: ChipsProps<Named>): ReactElement => {
  const every = chips.map((chip) => chip.value);

  return (
    <View style={styles.group}>
      {chips.map(({ value, text }) => {
        const pressed = chosen?.includes(value) === true;
        return (
          <Face
            key={value}
            on={pressed}
            onPress={() => onChosen(toggled(every, chosen, value))}
            role="button"
            state={{ selected: pressed }}
            text={text}
          />
        );
      })}
    </View>
  );
};

export const Choices = <Value,>({
  choices,
  chosen,
  onChoose,
}: ChoicesProps<Value>): ReactElement => (
  <View style={styles.group}>
    {choices.map(({ key, text, sub, value }) => (
      <Face
        key={key}
        on={key === chosen}
        onPress={() => onChoose(value)}
        role="radio"
        state={{ checked: key === chosen }}
        sub={sub}
        text={text}
      />
    ))}
  </View>
);
