import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { type ReactElement, useState } from "react";
import { TouchableOpacity } from "react-native";
import { dateAt, listingDate } from "../host/clock.js";
import { useTheme } from "../theme.js";
import { fieldBox, fieldColours, Section } from "./field.js";
import { ON_ANDROID } from "./platform.js";
import { Type } from "./type.js";

export interface DateFieldProps {
  readonly label: string;
  readonly date: string;
  readonly words: string;
  readonly onDate: (date: string) => void;
}

export const DateField = ({
  label,
  date,
  words,
  onDate,
}: DateFieldProps): ReactElement => {
  const theme = useTheme();
  const [picking, setPicking] = useState(false);
  const picked = (event: DateTimePickerEvent, at: Date | undefined) => {
    setPicking(false);
    if (event.type === "set" && at !== undefined) onDate(listingDate(at));
  };

  return (
    <Section label={label}>
      <TouchableOpacity
        accessibilityLabel={`${label}, ${words}`}
        accessibilityRole="button"
        onPress={() => setPicking(true)}
        style={[fieldBox, fieldColours(theme)]}
      >
        <Type set="ledgerField" tone="silver">
          {words}
        </Type>
      </TouchableOpacity>
      {picking && (
        <DateTimePicker
          display={ON_ANDROID ? "default" : "spinner"}
          mode="date"
          onChange={picked}
          testID="date-picker"
          themeVariant={theme.appearance === "down" ? "dark" : "light"}
          value={dateAt(date)}
        />
      )}
    </Section>
  );
};
