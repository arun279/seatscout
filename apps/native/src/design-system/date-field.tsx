import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { twoDigits } from "@seatscout/view-logic";
import { type ReactElement, useState } from "react";
import { Platform, TouchableOpacity } from "react-native";
import { useTheme } from "../theme.js";
import { fieldBox, fieldColours, Section } from "./field.js";
import { Type } from "./type.js";

export interface DateFieldProps {
  readonly label: string;
  readonly date: string;
  readonly words: string;
  readonly onDate: (date: string) => void;
}

const onAndroid = Platform.OS === "android";

export const listingDateOf = (at: Date): string =>
  `${at.getFullYear()}-${twoDigits(at.getMonth() + 1)}-${twoDigits(at.getDate())}`;

export const dateAt = (listing: string): Date =>
  new Date(
    Number(listing.slice(0, 4)),
    Number(listing.slice(5, 7)) - 1,
    Number(listing.slice(8, 10)),
  );

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
    if (event.type === "set" && at !== undefined) onDate(listingDateOf(at));
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
          display={onAndroid ? "default" : "spinner"}
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
