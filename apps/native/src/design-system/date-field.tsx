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

export interface PickerFieldProps {
  readonly label: string;
  readonly words: string;
  readonly mode: "date" | "time";
  readonly at: Date;
  readonly onPicked: (at: Date) => void;
}

export interface DateFieldProps {
  readonly label: string;
  readonly date: string;
  readonly words: string;
  readonly onDate: (date: string) => void;
}

export const PickerField = ({
  label,
  words,
  mode,
  at,
  onPicked,
}: PickerFieldProps): ReactElement => {
  const theme = useTheme();
  const [picking, setPicking] = useState(false);
  const picked = (event: DateTimePickerEvent, chosen: Date | undefined) => {
    setPicking(false);
    if (event.type === "set" && chosen !== undefined) onPicked(chosen);
  };

  return (
    <>
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
          mode={mode}
          onChange={picked}
          testID={`${mode}-picker`}
          themeVariant={theme.appearance === "down" ? "dark" : "light"}
          value={at}
        />
      )}
    </>
  );
};

export const DateField = ({
  label,
  date,
  words,
  onDate,
}: DateFieldProps): ReactElement => (
  <Section label={label}>
    <PickerField
      at={dateAt(date)}
      label={label}
      mode="date"
      onPicked={(at) => onDate(listingDate(at))}
      words={words}
    />
  </Section>
);
