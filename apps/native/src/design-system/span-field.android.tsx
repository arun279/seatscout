import { Host } from "@expo/ui/jetpack-compose";
import { DateRangePickerDialog } from "@expo/ui/jetpack-compose";
import { type ReactElement, useState } from "react";
import { TouchableOpacity } from "react-native";
import { useTheme } from "../theme.js";
import { fieldBox, fieldColours } from "./field.js";
import type { SpanFieldProps } from "./span-field.js";
import { Type } from "./type.js";

const midnightOf = (date: string) => `${date}T00:00:00Z`;

const dateOf = (at: Date) => at.toISOString().slice(0, 10);

export const SpanField = ({
  first,
  last,
  said,
  onSpan,
}: SpanFieldProps): ReactElement => {
  const theme = useTheme();
  const [picking, setPicking] = useState(false);

  return (
    <>
      <TouchableOpacity
        accessibilityLabel={said}
        accessibilityRole="button"
        onPress={() => setPicking(true)}
        style={[fieldBox, fieldColours(theme)]}
      >
        <Type set="ledgerField" tone="silver">
          {said}
        </Type>
      </TouchableOpacity>
      {picking && (
        <Host>
          <DateRangePickerDialog
            color={theme.colours.beam}
            initialEndDate={midnightOf(last)}
            initialStartDate={midnightOf(first)}
            onDateRangeSelected={({ start, end }) => {
              setPicking(false);
              if (start !== null && end !== null)
                onSpan(dateOf(start), dateOf(end));
            }}
            onDismissRequest={() => setPicking(false)}
          />
        </Host>
      )}
    </>
  );
};
