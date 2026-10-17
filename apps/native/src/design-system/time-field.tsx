import type { ReactElement } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { clockFor, timeAt } from "../host/clock.js";
import { PickerField } from "./picker-field.js";
import { TOUCH_FLOOR } from "./touch.js";
import { Type } from "./type.js";

export interface TimeFieldProps {
  readonly label: string;
  readonly words: string;
  readonly clock: string | undefined;
  readonly clear: string;
  readonly opensAt: string;
  readonly onClock: (clock: string | undefined) => void;
  readonly picking: boolean;
  readonly onPicking: (picking: boolean) => void;
}

const styles = StyleSheet.create({
  end: { gap: 6 },
  clear: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: TOUCH_FLOOR,
    minWidth: TOUCH_FLOOR,
  },
});

export const TimeField = ({
  label,
  words,
  clock,
  clear,
  opensAt,
  onClock,
  picking,
  onPicking,
}: TimeFieldProps): ReactElement => (
  <View style={styles.end}>
    <Type set="ledgerLabel" tone="silverFaint">
      {label}
    </Type>
    <PickerField
      at={timeAt(clock ?? opensAt)}
      beside={
        clock !== undefined && (
          <TouchableOpacity
            accessibilityLabel={`${clear}, ${label}`}
            accessibilityRole="button"
            onPress={() => {
              onPicking(false);
              onClock(undefined);
            }}
            style={styles.clear}
          >
            <Type set="sentenceStrong" tone="silverDim">
              ✕
            </Type>
          </TouchableOpacity>
        )
      }
      label={label}
      onPicked={(at) => onClock(clockFor(at))}
      onPicking={onPicking}
      picking={picking}
      words={words}
    />
  </View>
);
