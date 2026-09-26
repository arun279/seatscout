import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { type ReactElement, useState } from "react";
import { TouchableOpacity } from "react-native";
import { useTheme } from "../theme.js";
import { fieldBox, fieldColours } from "./field.js";
import { ON_ANDROID } from "./platform.js";
import { Type } from "./type.js";

export interface PickerFieldProps {
  readonly label: string;
  readonly words: string;
  readonly at: Date;
  readonly onPicked: (at: Date) => void;
}

export const PickerField = ({
  label,
  words,
  at,
  onPicked,
}: PickerFieldProps): ReactElement => {
  const theme = useTheme();
  const [picking, setPicking] = useState(false);
  const wheels = !ON_ANDROID;
  const picked = (event: DateTimePickerEvent, chosen: Date | undefined) => {
    if (!wheels) setPicking(false);
    if (event.type === "set" && chosen !== undefined) onPicked(chosen);
  };

  return (
    <>
      <TouchableOpacity
        accessibilityLabel={`${label}, ${words}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: picking }}
        onPress={() => {
          if (wheels && !picking) onPicked(at);
          setPicking(!picking);
        }}
        style={[fieldBox, fieldColours(theme)]}
      >
        <Type set="ledgerField" tone="silver">
          {words}
        </Type>
      </TouchableOpacity>
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
