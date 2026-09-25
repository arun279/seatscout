import type { ReactElement } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { clockFor, timeAt } from "../host/clock.js";
import { PickerField } from "./date-field.js";
import { TOUCH_FLOOR } from "./touch.js";
import { Type } from "./type.js";

export interface TimeFieldProps {
  readonly label: string;
  readonly words: string;
  readonly clock: string | undefined;
  readonly clear: string;
  readonly onClock: (clock: string | undefined) => void;
}

const EVENING = "19:00";

const styles = StyleSheet.create({
  end: { flex: 1, gap: 6 },
  row: { alignItems: "center", flexDirection: "row" },
  picked: { flex: 1 },
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
  onClock,
}: TimeFieldProps): ReactElement => (
  <View style={styles.end}>
    <Type set="ledgerLabel" tone="silverFaint">
      {label}
    </Type>
    <View style={styles.row}>
      <View style={styles.picked}>
        <PickerField
          at={timeAt(clock ?? EVENING)}
          label={label}
          mode="time"
          onPicked={(at) => onClock(clockFor(at))}
          words={words}
        />
      </View>
      {clock !== undefined && (
        <TouchableOpacity
          accessibilityLabel={`${clear}, ${label}`}
          accessibilityRole="button"
          onPress={() => onClock(undefined)}
          style={styles.clear}
        >
          <Type set="sentenceStrong" tone="silverDim">
            ✕
          </Type>
        </TouchableOpacity>
      )}
    </View>
  </View>
);
