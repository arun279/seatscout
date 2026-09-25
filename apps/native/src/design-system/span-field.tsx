import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { dateAt, listingDate } from "../host/clock.js";
import { PickerField } from "./date-field.js";
import { Type } from "./type.js";

export interface SpanFieldProps {
  readonly first: string;
  readonly last: string;
  readonly labels: readonly [string, string];
  readonly words: readonly [string, string];
  readonly said: string;
  readonly onSpan: (first: string, last: string) => void;
}

const styles = StyleSheet.create({
  ends: { flexDirection: "row", gap: 10 },
  end: { flex: 1, gap: 6 },
});

const spanned = (one: string, other: string) =>
  one <= other ? ([one, other] as const) : ([other, one] as const);

export const SpanField = ({
  first,
  last,
  labels,
  words,
  onSpan,
}: SpanFieldProps): ReactElement => {
  const ends = [
    {
      label: labels[0],
      said: words[0],
      date: first,
      span: (date: string) => spanned(date, last),
    },
    {
      label: labels[1],
      said: words[1],
      date: last,
      span: (date: string) => spanned(first, date),
    },
  ];

  return (
    <View style={styles.ends}>
      {ends.map(({ label, said, date, span }) => (
        <View key={label} style={styles.end}>
          <Type set="ledgerLabel" tone="silverFaint">
            {label}
          </Type>
          <PickerField
            at={dateAt(date)}
            label={label}
            mode="date"
            onPicked={(picked) => onSpan(...span(listingDate(picked)))}
            words={said}
          />
        </View>
      ))}
    </View>
  );
};
