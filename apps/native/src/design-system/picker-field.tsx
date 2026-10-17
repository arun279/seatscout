import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import type { ReactElement, ReactNode } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme.js";
import { fieldBox, fieldColours } from "./field.js";
import { ON_ANDROID } from "./platform.js";
import { Type } from "./type.js";

export interface PickerFieldProps {
  readonly label: string;
  readonly words: string;
  readonly at: Date;
  readonly onPicked: (at: Date) => void;
  readonly picking: boolean;
  readonly onPicking: (picking: boolean) => void;
  readonly beside?: ReactNode;
}

const styles = StyleSheet.create({
  row: { alignItems: "flex-start", flexDirection: "row" },
  field: { flex: 1 },
});

export const PickerField = ({
  label,
  words,
  at,
  onPicked,
  picking,
  onPicking,
  beside,
}: PickerFieldProps): ReactElement => {
  const theme = useTheme();
  const wheels = !ON_ANDROID;
  const picked = (event: DateTimePickerEvent, chosen: Date | undefined) => {
    if (!wheels) onPicking(false);
    if (event.type === "set" && chosen !== undefined) onPicked(chosen);
  };

  return (
    <>
      <View style={styles.row}>
        <TouchableOpacity
          accessibilityLabel={`${label}, ${words}`}
          accessibilityRole="button"
          accessibilityState={{ expanded: picking }}
          onPress={() => {
            if (wheels && !picking) onPicked(at);
            onPicking(!picking);
          }}
          style={[fieldBox, fieldColours(theme), styles.field]}
        >
          <Type set="ledgerField" tone="silver">
            {words}
          </Type>
        </TouchableOpacity>
        {beside}
      </View>
      {picking && (
        <DateTimePicker
          display={ON_ANDROID ? "default" : "spinner"}
          mode="time"
          onChange={picked}
          testID="time-picker"
          themeVariant={theme.appearance === "down" ? "dark" : "light"}
          value={at}
        />
      )}
    </>
  );
};
